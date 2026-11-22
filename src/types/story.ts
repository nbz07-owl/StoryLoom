export type ImageSize = "1K" | "2K" | "4K";

export type VoiceName = "Kore" | "Puck" | "Zephyr" | "Charon" | "Fenrir";

export type NarrationTone = "warm" | "playful" | "bedtime";

export type ChatMode = "companion" | "quick" | "coauthor" | "guide";

export interface IllustrationVersion {
  id: string;
  imageUrl: string;
  imageSize: ImageSize | "Starter";
  promptUsed: string;
  createdAt: number;
}

export interface StoryPage {
  id: string;
  pageNumber: number;
  chapterHeading: string;
  text: string;
  narrationTone: NarrationTone;
  illustrationPrompt: string;
  activeIllustrationUrl: string | null;
  illustrationHistory: IllustrationVersion[];
}

export interface StoryBook {
  id: string;
  title: string;
  subtitle: string;
  theme: string;
  ageGroup: string;
  artStyle: string;
  moral: string;
  characterVisualGuide: string;
  coverImageUrl: string;
  pages: StoryPage[];
  createdAt: number;
  isStarter?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  modelUsed?: string;
  roleTitle?: string;
  createdAt: number;
}

export const VOICE_OPTIONS: { id: VoiceName; label: string; description: string }[] = [
  { id: "Kore", label: "Clara", description: "Warm & clear storyteller" },
  { id: "Puck", label: "Pip", description: "Playful & bright sprite" },
  { id: "Zephyr", label: "Willow", description: "Soft bedtime whisper" },
  { id: "Charon", label: "Arthur", description: "Gentle wise grandfather" },
  { id: "Fenrir", label: "Bram", description: "Grand adventure narrator" },
];

export const TONE_OPTIONS: { id: NarrationTone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "bedtime", label: "Bedtime" },
];

export const CHAT_MODES: {
  id: ChatMode;
  label: string;
  model: string;
  summary: string;
}[] = [
  {
    id: "companion",
    label: "Companion",
    model: "gemini-4-hydrogen",
    summary: "Friendly Q&A and story wonder",
  },
  {
    id: "quick",
    label: "Word Helper",
    model: "gemini-3.1-flash-lite",
    summary: "Fast word meanings & rhymes",
  },
  {
    id: "coauthor",
    label: "Co-Author",
    model: "gemini-4-neon",
    summary: "Interactive twists & new scenes",
  },
  {
    id: "guide",
    label: "Deep Guide",
    model: "gemini-4-carbon",
    summary: "Story morals, clues & riddles",
  },
];

export const ART_STYLES = [
  "Watercolor & Ink",
  "Gouache Storybook",
  "Pastel & Colored Pencil",
  "Woodblock Folk Art",
] as const;

export const IMAGE_SIZES: ImageSize[] = ["1K", "2K", "4K"];
