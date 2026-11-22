import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      500,
      "GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel."
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const isTransient = msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand");
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function handleGeminiError(err: unknown, context: string): { status: number; message: string } {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message };
  }
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("403")) {
    return {
      status: 403,
      message: `${context} failed: Please verify your Gemini API key in Settings > Secrets.`,
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429") || lower.includes("quota")) {
    return {
      status: 429,
      message: `${context} hit a rate or quota limit. A billing-enabled API key in Settings > Secrets may be required for this model.`,
    };
  }
  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 404,
      message: `${context} could not reach the requested model (${rawMessage}).`,
    };
  }
  return {
    status: 500,
    message: `${context} error: ${rawMessage}`,
  };
}

const VALID_IMAGE_SIZES = new Set(["1K", "2K", "4K"]);
const VALID_ASPECT_RATIOS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);
const VALID_VOICES = new Set(["Kore", "Puck", "Zephyr", "Charon", "Fenrir"]);

const CHAT_MODE_CONFIG: Record<
  string,
  { model: string; roleTitle: string; systemInstruction: string }
> = {
  quick: {
    model: "gemini-3.1-flash-lite",
    roleTitle: "Quick Word Helper",
    systemInstruction:
      "You are the Quick Word Helper inside a children's picture book app called Storyloom. Give joyful, super-clear, bite-sized answers (2 to 4 short sentences max) tailored for kids. Help explain tricky words, invent playful rhymes, or answer quick curiosity questions about the current page.",
  },
  companion: {
    model: "gemini-4-hydrogen",
    roleTitle: "Story Companion",
    systemInstruction:
      "You are the Story Companion inside Storyloom, a warm children's picture book reading studio. Talk directly to the young reader with kindness, wonder, and imagination. Ask one engaging follow-up question when helpful, celebrate the child's ideas, and keep every reply safe, warm, and easy to read aloud.",
  },
  coauthor: {
    model: "gemini-4-neon",
    roleTitle: "Co-Author Studio",
    systemInstruction:
      "You are the Co-Author inside Storyloom, helping children invent interactive twists, alternate scenes, new characters, and choose-your-own-adventure branches for the book they are reading. Offer 2 vivid, playful choices or write a richly imagined mini-scene that stays true to the characters and tone of the current story.",
  },
  guide: {
    model: "gemini-4-carbon",
    roleTitle: "Deep Moral & Puzzle Guide",
    systemInstruction:
      "You are the Deep Moral & Puzzle Guide inside Storyloom. Use thoughtful reasoning to help children explore the deeper heart of the story: why characters made certain choices, gentle life lessons, hidden clues across pages, and clever age-appropriate riddles inspired by the tale. Keep your tone warm, encouraging, and understandable for kids and parents reading together.",
  },
};

const TONE_STYLE_MAP: Record<string, string> = {
  warm: "Warm, gentle, expressive children's picture-book storyteller with clear natural pacing",
  playful: "Lively, cheerful, theatrical children's storyteller full of wonder and delight",
  bedtime: "Soft, calm, soothing bedtime storyteller with a cozy, unhurried cadence",
};

const VALID_VIDEO_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const VALID_VIDEO_DURATIONS = new Set(["5s", "8s", "10s"]);
const VALID_VIDEO_RESOLUTIONS = new Set(["360p", "720p", "1080p"]);

function extractImageData(
  imageUrl: string | undefined | null
): { mimeType: string; data: string } | null {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
  }
  if (imageUrl.startsWith("/src/assets/images/")) {
    const safeName = path.basename(imageUrl);
    const fullPath = path.resolve(__dirname, "src/assets/images", safeName);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(safeName).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      const data = fs.readFileSync(fullPath).toString("base64");
      return { mimeType, data };
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "30mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.post("/api/stories/generate", async (req: Request, res: Response) => {
    try {
      const {
        idea = "",
        characterName = "",
        ageGroup = "6-8",
        pageCount = 4,
        artStyle = "Watercolor & Ink",
      } = req.body ?? {};

      const cleanIdea = String(idea).trim();
      if (!cleanIdea) {
        res.status(400).json({ error: "Please enter a story idea before creating your book." });
        return;
      }

      const safePageCount = Math.min(Math.max(Number(pageCount) || 4, 3), 5);
      const ai = getGeminiClient();

      const prompt = [
        `Write an original, enchanting children's picture book based on this idea: "${cleanIdea}".`,
        characterName ? `Main character name: ${String(characterName).trim()}.` : "",
        `Target reading age: ${String(ageGroup)} years old.`,
        `Exact number of pages: ${safePageCount}.`,
        `Preferred illustration style: ${String(artStyle)}.`,
        "Each page should have 2 to 4 vivid, rhythmic sentences suitable for reading aloud, a short chapter heading, a recommended narration tone ('warm', 'playful', or 'bedtime'), and a detailed, cohesive illustration prompt describing the exact scene, character appearance, lighting, and setting for that page.",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "You are an award-winning children's picture book author. Craft gentle, imaginative, age-appropriate stories with rich sensory details, clear emotional arcs, and cohesive visual descriptions across every page so an illustrator can paint consistent characters.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Magical title of the picture book." },
              subtitle: {
                type: Type.STRING,
                description: "Short poetic subtitle, 5 to 9 words.",
              },
              theme: {
                type: Type.STRING,
                description: "Two-word category such as Woodland Wonder or Bedtime Magic.",
              },
              moral: {
                type: Type.STRING,
                description: "A gentle, one-sentence takeaway for children.",
              },
              characterVisualGuide: {
                type: Type.STRING,
                description:
                  "Concise visual description of the main character's outfit, colors, and features so every page looks consistent.",
              },
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER },
                    chapterHeading: {
                      type: Type.STRING,
                      description: "Short 2 to 5 word heading for the page.",
                    },
                    text: {
                      type: Type.STRING,
                      description: "Engaging picture-book prose to read aloud.",
                    },
                    narrationTone: {
                      type: Type.STRING,
                      description: "One of: warm, playful, bedtime.",
                    },
                    illustrationPrompt: {
                      type: Type.STRING,
                      description:
                        "Detailed picture-book scene description for this specific page.",
                    },
                  },
                  required: [
                    "pageNumber",
                    "chapterHeading",
                    "text",
                    "narrationTone",
                    "illustrationPrompt",
                  ],
                },
              },
            },
            required: [
              "title",
              "subtitle",
              "theme",
              "moral",
              "characterVisualGuide",
              "pages",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json({ story: parsed });
    } catch (err) {
      const formatted = handleGeminiError(err, "Story generation");
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/illustrations/generate", async (req: Request, res: Response) => {
    try {
      const {
        prompt = "",
        artStyle = "Watercolor & Ink",
        imageSize = "1K",
        aspectRatio = "4:3",
        characterVisualGuide = "",
      } = req.body ?? {};

      const cleanPrompt = String(prompt).trim();
      if (!cleanPrompt) {
        res.status(400).json({ error: "Illustration scene prompt is required." });
        return;
      }

      const safeSize = VALID_IMAGE_SIZES.has(String(imageSize)) ? String(imageSize) : "1K";
      const safeRatio = VALID_ASPECT_RATIOS.has(String(aspectRatio)) ? String(aspectRatio) : "4:3";

      const fullPrompt = [
        `Children's picture book illustration in ${String(artStyle)} style, fine hand-crafted heirloom book art aesthetic, rich paper texture, warm inviting lighting, no text or watermarks in the image.`,
        characterVisualGuide ? `Character consistency guide: ${String(characterVisualGuide)}.` : "",
        `Scene: ${cleanPrompt}`,
      ]
        .filter(Boolean)
        .join(" ");

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: safeRatio,
              imageSize: safeSize,
            },
          },
        })
      );

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType ?? "image/png";
          const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          res.json({
            imageUrl,
            mimeType,
            imageSize: safeSize,
            promptUsed: cleanPrompt,
          });
          return;
        }
      }

      res.status(502).json({
        error: "The illustration model completed without returning an image. Please try adjusting the scene prompt.",
      });
    } catch (err) {
      const formatted = handleGeminiError(err, "Illustration generation");
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/tts/speak", async (req: Request, res: Response) => {
    try {
      const { text = "", voiceName = "Kore", tone = "warm" } = req.body ?? {};
      const cleanText = String(text).trim();
      if (!cleanText) {
        res.status(400).json({ error: "Story text is required for read-aloud narration." });
        return;
      }

      const safeVoice = VALID_VOICES.has(String(voiceName)) ? String(voiceName) : "Kore";
      const style = TONE_STYLE_MAP[String(tone)] ?? TONE_STYLE_MAP.warm;

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.8-flash-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: safeVoice,
                },
              },
            },
          },
        })
      );

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType ?? "audio/wav";
          const audioDataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          res.json({
            audioDataUrl,
            mimeType,
            voiceName: safeVoice,
          });
          return;
        }
      }

      res.status(502).json({ error: "Read-aloud narrator did not return audio data." });
    } catch (err) {
      const formatted = handleGeminiError(err, "Read-aloud narration");
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const {
        mode = "companion",
        message = "",
        history = [],
        storyContext = null,
      } = req.body ?? {};

      const cleanMessage = String(message).trim();
      if (!cleanMessage) {
        res.status(400).json({ error: "Please type a message for Story Buddy." });
        return;
      }

      const configEntry = CHAT_MODE_CONFIG[String(mode)] ?? CHAT_MODE_CONFIG.companion;
      const contextLines: string[] = [configEntry.systemInstruction];
      if (storyContext && typeof storyContext === "object") {
        const ctx = storyContext as {
          title?: string;
          pageNumber?: number;
          totalPages?: number;
          chapterHeading?: string;
          pageText?: string;
          moral?: string;
        };
        contextLines.push(
          `\nCurrent book context:\n- Title: ${ctx.title ?? "Unknown"}\n- Page: ${ctx.pageNumber ?? 1} of ${ctx.totalPages ?? 1} (${ctx.chapterHeading ?? ""})\n- Page Text: "${ctx.pageText ?? ""}"\n- Story Heart / Moral: ${ctx.moral ?? ""}`
        );
      }

      const formattedHistory = Array.isArray(history)
        ? history
            .filter(
              (item): item is { role: "user" | "model"; text: string } =>
                Boolean(item) &&
                (item.role === "user" || item.role === "model") &&
                typeof item.text === "string" &&
                item.text.trim().length > 0
            )
            .map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            }))
        : [];

      const ai = getGeminiClient();
      const chat = ai.chats.create({
        model: configEntry.model,
        history: formattedHistory,
        config: {
          systemInstruction: contextLines.join("\n"),
        },
      });

      const response = await withRetry(() =>
        chat.sendMessage({
          message: cleanMessage,
        })
      );

      res.json({
        reply: response.text ?? "I'm listening! Tell me what you noticed on this page.",
        modelUsed: configEntry.model,
        roleTitle: configEntry.roleTitle,
      });
    } catch (err) {
      const formatted = handleGeminiError(err, "Story Buddy chat");
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/videos/generate", async (req: Request, res: Response) => {
    try {
      const {
        prompt = "",
        artStyle = "Watercolor & Ink",
        imageUrl = "",
        aspectRatio = "16:9",
        duration = "5s",
        resolution = "720p",
        characterVisualGuide = "",
        previousInteractionId = "",
      } = req.body ?? {};

      const cleanPrompt = String(prompt).trim();
      if (!cleanPrompt) {
        res.status(400).json({ error: "A scene description is required to generate a video." });
        return;
      }

      const safeRatio = VALID_VIDEO_ASPECT_RATIOS.has(String(aspectRatio))
        ? (String(aspectRatio) as "16:9" | "9:16")
        : "16:9";
      const safeDuration = VALID_VIDEO_DURATIONS.has(String(duration))
        ? String(duration)
        : "5s";
      const safeResolution = VALID_VIDEO_RESOLUTIONS.has(String(resolution))
        ? (String(resolution) as "360p" | "720p" | "1080p")
        : "720p";

      const ai = getGeminiClient();
      const imageData = previousInteractionId ? null : extractImageData(String(imageUrl));

      const motionInstruction = previousInteractionId
        ? cleanPrompt
        : [
            `Gentle, enchanting children's picture-book animation in ${String(artStyle)} style with smooth, cozy motion and soft lighting.`,
            characterVisualGuide ? `Character consistency: ${String(characterVisualGuide)}.` : "",
            `Scene motion: ${cleanPrompt}`,
          ]
            .filter(Boolean)
            .join(" ");

      const inputPayload = imageData
        ? [
            {
              type: "image" as const,
              mime_type: imageData.mimeType,
              data: imageData.data,
            },
            {
              type: "text" as const,
              text: motionInstruction,
            },
          ]
        : motionInstruction;

      const interaction = await withRetry(
        () =>
          ai.interactions.create(
            {
              model: "gemini-omni-1.2-flash",
              ...(previousInteractionId
                ? { previous_interaction_id: String(previousInteractionId) }
                : {}),
              input: inputPayload,
              background: false,
              store: true,
              stream: false,
              response_format: {
                type: "video",
                aspect_ratio: safeRatio,
                duration: safeDuration,
                resolution: safeResolution,
              },
            },
            { timeout: 300000 }
          ),
        1
      );

      const videoPart = interaction.output_video;
      if (videoPart?.data) {
        const mimeType = videoPart.mime_type || "video/mp4";
        const videoUrl = `data:${mimeType};base64,${videoPart.data}`;
        res.json({
          videoUrl,
          mimeType,
          interactionId: interaction.id,
          aspectRatio: safeRatio,
          duration: safeDuration,
          resolution: safeResolution,
          promptUsed: cleanPrompt,
        });
        return;
      }

      if (videoPart?.uri) {
        res.json({
          videoUrl: videoPart.uri,
          mimeType: videoPart.mime_type || "video/mp4",
          interactionId: interaction.id,
          aspectRatio: safeRatio,
          duration: safeDuration,
          resolution: safeResolution,
          promptUsed: cleanPrompt,
        });
        return;
      }

      res.status(502).json({
        error: "Video generation completed without returning video data. Please try again.",
      });
    } catch (err) {
      const formatted = handleGeminiError(err, "Video generation");
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build artifacts not found. Run npm run build first.");
      }
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Storyloom server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Storyloom server:", err);
  process.exit(1);
});
