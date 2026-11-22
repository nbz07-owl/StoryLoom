import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { StorySpread } from "./components/StorySpread";
import { LibraryShelf } from "./components/LibraryShelf";
import { CreateStorySection } from "./components/CreateStorySection";
import { StoryBuddyDrawer } from "./components/StoryBuddyDrawer";
import { STARTER_BOOKS } from "./data/starterStories";
import {
  deleteBookFromLibrary,
  loadSavedBooks,
  saveBookToLibrary,
} from "./utils/storage";
import type {
  ChatMessage,
  ChatMode,
  ImageSize,
  NarrationTone,
  StoryBook,
  StoryPage,
  VideoAspectRatio,
  VideoDuration,
  VideoResolution,
  VoiceName,
} from "./types/story";

const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function dataUrlToBlobUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return dataUrl;
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch?.[1] || "audio/wav";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function primeAudioElement(ref: { current: HTMLAudioElement | null }): HTMLAudioElement {
  if (!ref.current) {
    ref.current = new Audio();
  }
  const el = ref.current;
  if (!el.src) {
    el.src = SILENT_WAV_DATA_URI;
    el.play().then(() => el.pause()).catch(() => {});
  }
  return el;
}

export default function App() {
  const [books, setBooks] = useState<StoryBook[]>(STARTER_BOOKS);
  const [activeBookId, setActiveBookId] = useState<string>(STARTER_BOOKS[0].id);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<"reader" | "library" | "create" | "buddy">(
    "reader"
  );

  // Illustration studio state
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isBatchIllustrating, setIsBatchIllustrating] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  // Video studio state (gemini-omni-1.2-flash)
  const [videoDuration, setVideoDuration] = useState<VideoDuration>("5s");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("720p");
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Story creation state
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [creationStatus, setCreationStatus] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);

  // Read-Aloud Audio Theater state (gemini-3.8-flash-tts)
  const [voiceName, setVoiceName] = useState<VoiceName>("Kore");
  const [narrationTone, setNarrationTone] = useState<NarrationTone>("warm");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTts, setIsLoadingTts] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [autoReadBook, setAutoReadBook] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const autoReadRef = useRef(autoReadBook);
  autoReadRef.current = autoReadBook;

  // Story Buddy multi-turn chat state
  const [isBuddyOpen, setIsBuddyOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("companion");
  const [chatHistoryByBook, setChatHistoryByBook] = useState<Record<string, ChatMessage[]>>({});
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const buddyAudioRef = useRef<HTMLAudioElement | null>(null);

  // Hydrate saved books & newly illustrated starter book variants from IndexedDB
  useEffect(() => {
    let cancelled = false;
    loadSavedBooks().then((saved) => {
      if (cancelled || saved.length === 0) return;
      setBooks(() => {
        const savedMap = new Map(saved.map((b) => [b.id, b]));
        const mergedStarters = STARTER_BOOKS.map((s) => savedMap.get(s.id) ?? s);
        const starterIds = new Set(STARTER_BOOKS.map((s) => s.id));
        const customBooks = saved.filter((b) => !starterIds.has(b.id));
        return [...customBooks, ...mergedStarters];
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) ?? books[0],
    [books, activeBookId]
  );

  const activePage: StoryPage = useMemo(
    () => activeBook.pages[pageIndex] ?? activeBook.pages[0],
    [activeBook, pageIndex]
  );

  const activeBookIdRef = useRef(activeBook.id);
  activeBookIdRef.current = activeBook.id;
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const pageCountRef = useRef(activeBook.pages.length);
  pageCountRef.current = activeBook.pages.length;

  const stopPageAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
  }, []);

  const stopBuddyAudio = useCallback(() => {
    if (buddyAudioRef.current) {
      buddyAudioRef.current.pause();
      buddyAudioRef.current.currentTime = 0;
    }
    setSpeakingMessageId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopPageAudio();
      stopBuddyAudio();
    };
  }, [stopPageAudio, stopBuddyAudio]);

  // Reset audio state cleanly when switching books or pages manually
  const handleSelectPage = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= activeBook.pages.length) return;
      stopPageAudio();
      setPageIndex(nextIndex);
      setTtsError(null);
      setImageError(null);
      const pageTone = activeBook.pages[nextIndex]?.narrationTone;
      if (pageTone) {
        setNarrationTone(pageTone);
      }
    },
    [activeBook.pages, stopPageAudio]
  );

  const playPageTts = useCallback(
    async (targetBook: StoryBook, targetIndex: number, voice: VoiceName, tone: NarrationTone) => {
      const targetPage = targetBook.pages[targetIndex];
      if (!targetPage) return;

      stopBuddyAudio();
      setTtsError(null);

      const cacheKey = `${targetPage.id}__${voice}__${tone}__${targetPage.text}`;
      let audioDataUrl = audioCacheRef.current.get(cacheKey);

      if (!audioDataUrl) {
        setIsLoadingTts(true);
        try {
          const res = await fetch("/api/tts/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: targetPage.text,
              voiceName: voice,
              tone,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.audioDataUrl) {
            throw new Error(data.error || "Unable to synthesize speech for this page.");
          }
          audioDataUrl = dataUrlToBlobUrl(data.audioDataUrl as string);
          audioCacheRef.current.set(cacheKey, audioDataUrl);
        } catch (err) {
          setIsLoadingTts(false);
          setIsSpeaking(false);
          setTtsError(err instanceof Error ? err.message : "Read-aloud failed.");
          return;
        } finally {
          setIsLoadingTts(false);
        }
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const player = audioRef.current;
      player.pause();
      player.src = audioDataUrl;
      player.currentTime = 0;

      player.ontimeupdate = () => {
        const dur = player.duration || 0;
        const cur = player.currentTime || 0;
        setAudioDuration(dur);
        setAudioCurrentTime(cur);
        setAudioProgress(dur > 0 ? cur / dur : 0);
      };

      player.onloadedmetadata = () => {
        setAudioDuration(player.duration || 0);
      };

      player.onended = () => {
        setIsSpeaking(false);
        setAudioProgress(1);
        if (
          autoReadRef.current &&
          activeBookIdRef.current === targetBook.id &&
          pageIndexRef.current === targetIndex &&
          targetIndex + 1 < pageCountRef.current
        ) {
          const nextIdx = targetIndex + 1;
          setPageIndex(nextIdx);
          const nextTone = targetBook.pages[nextIdx]?.narrationTone ?? tone;
          setNarrationTone(nextTone);
          void playPageTts(targetBook, nextIdx, voice, nextTone);
        }
      };

      player.onerror = () => {
        setIsSpeaking(false);
        setTtsError("Audio playback encountered an error.");
      };

      try {
        await player.play();
        setIsSpeaking(true);
      } catch (err) {
        setIsSpeaking(false);
        setTtsError(err instanceof Error ? err.message : "Browser blocked audio playback.");
      }
    },
    [stopBuddyAudio]
  );

  const handleTogglePlayPage = useCallback(() => {
    if (isLoadingTts) return;
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
      return;
    }
    if (
      audioRef.current &&
      audioRef.current.src &&
      audioRef.current.src !== SILENT_WAV_DATA_URI &&
      audioRef.current.currentTime > 0 &&
      audioRef.current.currentTime < (audioRef.current.duration || Infinity)
    ) {
      audioRef.current
        .play()
        .then(() => setIsSpeaking(true))
        .catch(() => void playPageTts(activeBook, pageIndex, voiceName, narrationTone));
      return;
    }
    primeAudioElement(audioRef);
    void playPageTts(activeBook, pageIndex, voiceName, narrationTone);
  }, [
    isLoadingTts,
    isSpeaking,
    playPageTts,
    activeBook,
    pageIndex,
    voiceName,
    narrationTone,
  ]);

  const handleReplayPage = useCallback(() => {
    stopPageAudio();
    primeAudioElement(audioRef);
    void playPageTts(activeBook, pageIndex, voiceName, narrationTone);
  }, [stopPageAudio, playPageTts, activeBook, pageIndex, voiceName, narrationTone]);

  const handleChangeVoice = useCallback(
    (nextVoice: VoiceName) => {
      setVoiceName(nextVoice);
      if (isSpeaking) {
        stopPageAudio();
        void playPageTts(activeBook, pageIndex, nextVoice, narrationTone);
      }
    },
    [isSpeaking, stopPageAudio, playPageTts, activeBook, pageIndex, narrationTone]
  );

  const handleChangeTone = useCallback(
    (nextTone: NarrationTone) => {
      setNarrationTone(nextTone);
      if (isSpeaking) {
        stopPageAudio();
        void playPageTts(activeBook, pageIndex, voiceName, nextTone);
      }
    },
    [isSpeaking, stopPageAudio, playPageTts, activeBook, pageIndex, voiceName]
  );

  const updateBookPageIllustration = useCallback(
    (
      bookId: string,
      targetPageId: string,
      imageUrl: string,
      usedSize: ImageSize,
      promptUsed: string
    ) => {
      setBooks((prev) => {
        const nextBooks = prev.map((b) => {
          if (b.id !== bookId) return b;
          const updatedPages = b.pages.map((p) => {
            if (p.id !== targetPageId) return p;
            const version = {
              id: `${targetPageId}-${Date.now()}`,
              imageUrl,
              imageSize: usedSize,
              promptUsed,
              createdAt: Date.now(),
            };
            return {
              ...p,
              illustrationPrompt: promptUsed,
              activeIllustrationUrl: imageUrl,
              illustrationHistory: [version, ...p.illustrationHistory],
            };
          });
          const updatedBook: StoryBook = {
            ...b,
            coverImageUrl:
              updatedPages[0]?.activeIllustrationUrl || b.coverImageUrl,
            pages: updatedPages,
          };
          void saveBookToLibrary(updatedBook);
          return updatedBook;
        });
        return nextBooks;
      });
    },
    []
  );

  const requestPageIllustration = useCallback(
    async (
      targetBook: StoryBook,
      targetPage: StoryPage,
      size: ImageSize,
      customPrompt?: string,
      customStyle?: string
    ): Promise<boolean> => {
      const promptToUse = (customPrompt ?? targetPage.illustrationPrompt).trim();
      const styleToUse = customStyle ?? targetBook.artStyle;

      const res = await fetch("/api/illustrations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          artStyle: styleToUse,
          imageSize: size,
          aspectRatio: "4:3",
          characterVisualGuide: targetBook.characterVisualGuide,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || "Unable to generate illustration.");
      }
      updateBookPageIllustration(
        targetBook.id,
        targetPage.id,
        data.imageUrl as string,
        size,
        promptToUse
      );
      return true;
    },
    [updateBookPageIllustration]
  );

  const handleGenerateCurrentIllustration = useCallback(
    async (customPrompt?: string, customArtStyle?: string) => {
      if (isGeneratingImage || isBatchIllustrating) return;
      setImageError(null);
      setIsGeneratingImage(true);
      try {
        await requestPageIllustration(
          activeBook,
          activePage,
          imageSize,
          customPrompt,
          customArtStyle
        );
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Illustration generation failed.");
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [
      isGeneratingImage,
      isBatchIllustrating,
      requestPageIllustration,
      activeBook,
      activePage,
      imageSize,
    ]
  );

  const handleIllustrateRemainingPages = useCallback(async () => {
    if (isGeneratingImage || isBatchIllustrating) return;
    const missing = activeBook.pages.filter((p) => !p.activeIllustrationUrl);
    if (missing.length === 0) return;

    setImageError(null);
    setIsBatchIllustrating(true);
    try {
      for (let i = 0; i < missing.length; i++) {
        const target = missing[i];
        setBatchProgressText(`Painting ${i + 1}/${missing.length}...`);
        await requestPageIllustration(activeBook, target, imageSize);
      }
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Could not finish illustrating all pages."
      );
    } finally {
      setIsBatchIllustrating(false);
      setBatchProgressText("");
    }
  }, [
    isGeneratingImage,
    isBatchIllustrating,
    activeBook,
    requestPageIllustration,
    imageSize,
  ]);

  const handleSelectIllustrationVersion = useCallback(
    (imageUrl: string) => {
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== activeBook.id) return b;
          const updatedPages = b.pages.map((p) =>
            p.id === activePage.id ? { ...p, activeIllustrationUrl: imageUrl } : p
          );
          const updatedBook: StoryBook = {
            ...b,
            coverImageUrl: updatedPages[0]?.activeIllustrationUrl || b.coverImageUrl,
            pages: updatedPages,
          };
          void saveBookToLibrary(updatedBook);
          return updatedBook;
        })
      );
    },
    [activeBook.id, activePage.id]
  );

  const updateBookPageVideo = useCallback(
    (
      bookId: string,
      targetPageId: string,
      videoUrl: string,
      interactionId: string | undefined,
      duration: VideoDuration,
      resolution: VideoResolution,
      aspectRatio: VideoAspectRatio,
      promptUsed: string
    ) => {
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== bookId) return b;
          const updatedPages = b.pages.map((p) => {
            if (p.id !== targetPageId) return p;
            const clip = {
              id: `${targetPageId}-vid-${Date.now()}`,
              videoUrl,
              interactionId,
              duration,
              resolution,
              aspectRatio,
              promptUsed,
              createdAt: Date.now(),
            };
            return {
              ...p,
              activeVideoUrl: videoUrl,
              activeVideoInteractionId: interactionId ?? null,
              videoHistory: [clip, ...(p.videoHistory ?? [])],
            };
          });
          const updatedBook: StoryBook = { ...b, pages: updatedPages };
          void saveBookToLibrary(updatedBook);
          return updatedBook;
        })
      );
    },
    []
  );

  const requestPageVideo = useCallback(
    async (
      targetBook: StoryBook,
      targetPage: StoryPage,
      options: {
        prompt?: string;
        sourceImageUrl?: string | null;
        duration: VideoDuration;
        resolution: VideoResolution;
        aspectRatio: VideoAspectRatio;
        previousInteractionId?: string | null;
      }
    ) => {
      const promptToUse = (options.prompt ?? targetPage.illustrationPrompt).trim();
      const res = await fetch("/api/videos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          artStyle: targetBook.artStyle,
          imageUrl: options.previousInteractionId ? "" : options.sourceImageUrl ?? "",
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          resolution: options.resolution,
          characterVisualGuide: targetBook.characterVisualGuide,
          previousInteractionId: options.previousInteractionId ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.videoUrl) {
        throw new Error(data.error || "Unable to generate video.");
      }
      updateBookPageVideo(
        targetBook.id,
        targetPage.id,
        data.videoUrl as string,
        data.interactionId as string | undefined,
        options.duration,
        options.resolution,
        options.aspectRatio,
        promptToUse
      );
    },
    [updateBookPageVideo]
  );

  const handleGenerateCurrentVideo = useCallback(
    async (customPrompt?: string, extendPrevious = false) => {
      if (isGeneratingVideo || isGeneratingImage || isBatchIllustrating) return;
      setVideoError(null);
      setIsGeneratingVideo(true);
      try {
        await requestPageVideo(activeBook, activePage, {
          prompt: extendPrevious
            ? `Continue the scene smoothly: ${customPrompt || activePage.illustrationPrompt}`
            : customPrompt,
          sourceImageUrl: activePage.activeIllustrationUrl,
          duration: videoDuration,
          resolution: videoResolution,
          aspectRatio: videoAspectRatio,
          previousInteractionId: extendPrevious ? activePage.activeVideoInteractionId : null,
        });
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : "Video generation failed.");
      } finally {
        setIsGeneratingVideo(false);
      }
    },
    [
      isGeneratingVideo,
      isGeneratingImage,
      isBatchIllustrating,
      requestPageVideo,
      activeBook,
      activePage,
      videoDuration,
      videoResolution,
      videoAspectRatio,
    ]
  );

  const handleSelectVideoVersion = useCallback(
    (videoUrl: string, interactionId?: string) => {
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== activeBook.id) return b;
          const updatedPages = b.pages.map((p) =>
            p.id === activePage.id
              ? {
                  ...p,
                  activeVideoUrl: videoUrl,
                  activeVideoInteractionId: interactionId ?? null,
                }
              : p
          );
          const updatedBook: StoryBook = { ...b, pages: updatedPages };
          void saveBookToLibrary(updatedBook);
          return updatedBook;
        })
      );
    },
    [activeBook.id, activePage.id]
  );

  const handleCreateStory = useCallback(
    async (params: {
      idea: string;
      characterName: string;
      ageGroup: string;
      pageCount: number;
      artStyle: string;
      imageSize: ImageSize;
      includeTrailerVideo: boolean;
    }) => {
      setCreationError(null);
      setIsCreatingStory(true);
      setCreationStatus("Writing story chapters...");
      setImageSize(params.imageSize);

      try {
        const res = await fetch("/api/stories/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.story) {
          throw new Error(data.error || "Unable to create story.");
        }

        const raw = data.story as {
          title: string;
          subtitle: string;
          theme: string;
          moral: string;
          characterVisualGuide: string;
          pages: {
            pageNumber: number;
            chapterHeading: string;
            text: string;
            narrationTone?: string;
            illustrationPrompt: string;
          }[];
        };

        const bookId = `book-${Date.now()}`;
        const pages: StoryPage[] = (raw.pages ?? []).map((p, idx) => {
          const safeTone: NarrationTone =
            p.narrationTone === "playful" || p.narrationTone === "bedtime"
              ? p.narrationTone
              : "warm";
          return {
            id: `${bookId}-p${idx + 1}`,
            pageNumber: idx + 1,
            chapterHeading: p.chapterHeading || `Chapter ${idx + 1}`,
            text: p.text,
            narrationTone: safeTone,
            illustrationPrompt: p.illustrationPrompt,
            activeIllustrationUrl: null,
            illustrationHistory: [],
          };
        });

        const newBook: StoryBook = {
          id: bookId,
          title: raw.title || "Untitled Storybook",
          subtitle: raw.subtitle || "A freshly written tale",
          theme: raw.theme || "Original Tale",
          ageGroup: params.ageGroup,
          artStyle: params.artStyle,
          moral: raw.moral || "",
          characterVisualGuide: raw.characterVisualGuide || "",
          coverImageUrl: "",
          pages,
          createdAt: Date.now(),
          isStarter: false,
        };

        setBooks((prev) => [newBook, ...prev]);
        setActiveBookId(bookId);
        setPageIndex(0);
        stopPageAudio();
        void saveBookToLibrary(newBook);

        document
          .getElementById("reader-section")
          ?.scrollIntoView({ behavior: "smooth" });
        setActiveSection("reader");

        // Automatically paint an illustration for every page of the newly created story
        setIsBatchIllustrating(true);
        let firstPageImageUrl: string | null = null;
        for (let i = 0; i < newBook.pages.length; i++) {
          const targetPage = newBook.pages[i];
          setCreationStatus(
            `Painting illustration ${i + 1} of ${newBook.pages.length} (${params.imageSize})...`
          );
          setBatchProgressText(`Painting ${i + 1}/${newBook.pages.length}...`);
          try {
            const resImg = await fetch("/api/illustrations/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: targetPage.illustrationPrompt,
                artStyle: newBook.artStyle,
                imageSize: params.imageSize,
                aspectRatio: "4:3",
                characterVisualGuide: newBook.characterVisualGuide,
              }),
            });
            const imgData = await resImg.json();
            if (!resImg.ok || !imgData.imageUrl) {
              throw new Error(imgData.error || `Failed to paint page ${i + 1}.`);
            }
            if (i === 0) {
              firstPageImageUrl = imgData.imageUrl as string;
            }
            updateBookPageIllustration(
              newBook.id,
              targetPage.id,
              imgData.imageUrl as string,
              params.imageSize,
              targetPage.illustrationPrompt
            );
          } catch (imgErr) {
            setImageError(
              imgErr instanceof Error
                ? imgErr.message
                : `Failed to paint page ${i + 1}.`
            );
            break;
          }
        }

        if (params.includeTrailerVideo && newBook.pages[0]) {
          setIsGeneratingVideo(true);
          setCreationStatus("Animating Page 1 into a storybook video...");
          try {
            await requestPageVideo(newBook, newBook.pages[0], {
              prompt: newBook.pages[0].illustrationPrompt,
              sourceImageUrl: firstPageImageUrl,
              duration: "5s",
              resolution: videoResolution,
              aspectRatio: videoAspectRatio,
            });
          } catch (vidErr) {
            setVideoError(
              vidErr instanceof Error ? vidErr.message : "Could not animate Page 1 video."
            );
          } finally {
            setIsGeneratingVideo(false);
          }
        }
      } catch (err) {
        setCreationError(
          err instanceof Error ? err.message : "Could not create your story."
        );
      } finally {
        setIsCreatingStory(false);
        setIsBatchIllustrating(false);
        setBatchProgressText("");
        setCreationStatus("");
      }
    },
    [
      stopPageAudio,
      updateBookPageIllustration,
      requestPageVideo,
      videoResolution,
      videoAspectRatio,
    ]
  );

  const handleSelectBook = useCallback(
    (bookId: string) => {
      stopPageAudio();
      setActiveBookId(bookId);
      setPageIndex(0);
      setImageError(null);
      setTtsError(null);
      const found = books.find((b) => b.id === bookId);
      if (found?.pages[0]?.narrationTone) {
        setNarrationTone(found.pages[0].narrationTone);
      }
      setActiveSection("reader");
      document.getElementById("reader-section")?.scrollIntoView({ behavior: "smooth" });
    },
    [books, stopPageAudio]
  );

  const handleDeleteBook = useCallback(
    (bookId: string) => {
      void deleteBookFromLibrary(bookId);
      setBooks((prev) => {
        const filtered = prev.filter((b) => b.id !== bookId);
        if (activeBookId === bookId && filtered.length > 0) {
          setActiveBookId(filtered[0].id);
          setPageIndex(0);
        }
        return filtered;
      });
    },
    [activeBookId]
  );

  // Story Buddy multi-turn chat handlers
  const activeChatMessages = chatHistoryByBook[activeBook.id] ?? [];

  const handleSendChatMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-u-${Date.now()}`,
        role: "user",
        text,
        createdAt: Date.now(),
      };

      const prevHistory = chatHistoryByBook[activeBook.id] ?? [];
      setChatHistoryByBook((prev) => ({
        ...prev,
        [activeBook.id]: [...(prev[activeBook.id] ?? []), userMsg],
      }));
      setChatError(null);
      setIsSendingChat(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: chatMode,
            message: text,
            history: prevHistory.map((m) => ({ role: m.role, text: m.text })),
            storyContext: {
              title: activeBook.title,
              pageNumber: activePage.pageNumber,
              totalPages: activeBook.pages.length,
              chapterHeading: activePage.chapterHeading,
              pageText: activePage.text,
              moral: activeBook.moral,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.reply) {
          throw new Error(data.error || "Story Buddy could not answer right now.");
        }

        const replyMsg: ChatMessage = {
          id: `msg-m-${Date.now()}`,
          role: "model",
          text: data.reply as string,
          modelUsed: data.modelUsed as string | undefined,
          roleTitle: data.roleTitle as string | undefined,
          createdAt: Date.now(),
        };

        setChatHistoryByBook((prev) => ({
          ...prev,
          [activeBook.id]: [...(prev[activeBook.id] ?? []), replyMsg],
        }));
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "Chat failed.");
      } finally {
        setIsSendingChat(false);
      }
    },
    [chatHistoryByBook, activeBook, activePage, chatMode]
  );

  const handleSpeakBuddyReply = useCallback(
    async (messageId: string, text: string) => {
      if (speakingMessageId === messageId) {
        stopBuddyAudio();
        return;
      }
      stopPageAudio();
      stopBuddyAudio();
      primeAudioElement(buddyAudioRef);
      setSpeakingMessageId(messageId);
      setChatError(null);

      try {
        const res = await fetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceName,
            tone: "warm",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.audioDataUrl) {
          throw new Error(data.error || "Could not read Story Buddy reply aloud.");
        }
        const player = primeAudioElement(buddyAudioRef);
        const blobUrl = dataUrlToBlobUrl(data.audioDataUrl as string);
        player.src = blobUrl;
        player.onended = () => {
          URL.revokeObjectURL(blobUrl);
          setSpeakingMessageId(null);
        };
        player.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          setSpeakingMessageId(null);
        };
        await player.play();
      } catch (err) {
        setSpeakingMessageId(null);
        setChatError(err instanceof Error ? err.message : "Audio playback failed.");
      }
    },
    [speakingMessageId, stopBuddyAudio, stopPageAudio, voiceName]
  );

  const handleNavigate = (section: "reader" | "library" | "create" | "buddy") => {
    setActiveSection(section);
    if (section === "buddy") {
      setIsBuddyOpen(true);
      return;
    }
    const idMap = {
      reader: "reader-section",
      library: "library-section",
      create: "create-section",
    };
    document.getElementById(idMap[section])?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1F1C18]">
      <TopBar activeSection={activeSection} onNavigate={handleNavigate} />

      <main className="flex-1">
        <StorySpread
          book={activeBook}
          pageIndex={pageIndex}
          onSelectPage={handleSelectPage}
          imageSize={imageSize}
          onChangeImageSize={setImageSize}
          isGeneratingImage={isGeneratingImage}
          isBatchIllustrating={isBatchIllustrating}
          batchProgressText={batchProgressText}
          imageError={imageError}
          onGenerateIllustration={handleGenerateCurrentIllustration}
          onIllustrateRemainingPages={handleIllustrateRemainingPages}
          onSelectIllustrationVersion={handleSelectIllustrationVersion}
          videoDuration={videoDuration}
          onChangeVideoDuration={setVideoDuration}
          videoResolution={videoResolution}
          onChangeVideoResolution={setVideoResolution}
          videoAspectRatio={videoAspectRatio}
          onChangeVideoAspectRatio={setVideoAspectRatio}
          isGeneratingVideo={isGeneratingVideo}
          videoError={videoError}
          onGenerateVideo={handleGenerateCurrentVideo}
          onSelectVideoVersion={handleSelectVideoVersion}
          voiceName={voiceName}
          onChangeVoice={handleChangeVoice}
          narrationTone={narrationTone}
          onChangeTone={handleChangeTone}
          isSpeaking={isSpeaking}
          isLoadingTts={isLoadingTts}
          ttsError={ttsError}
          audioProgress={audioProgress}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          autoReadBook={autoReadBook}
          onToggleAutoRead={() => setAutoReadBook((prev) => !prev)}
          onTogglePlayPage={handleTogglePlayPage}
          onReplayPage={handleReplayPage}
          onOpenBuddy={() => setIsBuddyOpen(true)}
        />

        <LibraryShelf
          books={books}
          activeBookId={activeBook.id}
          onSelectBook={handleSelectBook}
          onDeleteBook={handleDeleteBook}
        />

        <CreateStorySection
          isCreating={isCreatingStory}
          creationStatus={creationStatus}
          error={creationError}
          onCreateStory={handleCreateStory}
        />
      </main>

      <footer className="border-t border-[#E4DDD0] bg-[#FAF8F4]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#786E62]">
          <span className="font-display text-sm font-medium text-[#3D352C]">
            Storyloom
          </span>
          <span>
            Interactive Picture Book Studio · Read-Aloud Narration & Page Illustration
          </span>
        </div>
      </footer>

      <StoryBuddyDrawer
        isOpen={isBuddyOpen}
        onClose={() => setIsBuddyOpen(false)}
        book={activeBook}
        currentPage={activePage}
        messages={activeChatMessages}
        chatMode={chatMode}
        onChangeMode={setChatMode}
        onSendMessage={handleSendChatMessage}
        onResetChat={() =>
          setChatHistoryByBook((prev) => ({ ...prev, [activeBook.id]: [] }))
        }
        onSpeakReply={handleSpeakBuddyReply}
        speakingMessageId={speakingMessageId}
        isSending={isSendingChat}
        chatError={chatError}
      />
    </div>
  );
}
