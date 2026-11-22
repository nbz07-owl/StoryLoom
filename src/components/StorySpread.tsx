import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Layers,
  Loader2,
  MessageSquare,
  Paintbrush,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  ART_STYLES,
  IMAGE_SIZES,
  TONE_OPTIONS,
  VOICE_OPTIONS,
} from "../types/story";
import type {
  ImageSize,
  NarrationTone,
  StoryBook,
  StoryPage,
  VoiceName,
} from "../types/story";

interface StorySpreadProps {
  book: StoryBook;
  pageIndex: number;
  onSelectPage: (index: number) => void;
  imageSize: ImageSize;
  onChangeImageSize: (size: ImageSize) => void;
  isGeneratingImage: boolean;
  isBatchIllustrating: boolean;
  batchProgressText: string;
  imageError: string | null;
  onGenerateIllustration: (customPrompt?: string, customArtStyle?: string) => void;
  onIllustrateRemainingPages: () => void;
  onSelectIllustrationVersion: (imageUrl: string) => void;
  voiceName: VoiceName;
  onChangeVoice: (voice: VoiceName) => void;
  narrationTone: NarrationTone;
  onChangeTone: (tone: NarrationTone) => void;
  isSpeaking: boolean;
  isLoadingTts: boolean;
  ttsError: string | null;
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  autoReadBook: boolean;
  onToggleAutoRead: () => void;
  onTogglePlayPage: () => void;
  onReplayPage: () => void;
  onOpenBuddy: () => void;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

export const StorySpread: React.FC<StorySpreadProps> = ({
  book,
  pageIndex,
  onSelectPage,
  imageSize,
  onChangeImageSize,
  isGeneratingImage,
  isBatchIllustrating,
  batchProgressText,
  imageError,
  onGenerateIllustration,
  onIllustrateRemainingPages,
  onSelectIllustrationVersion,
  voiceName,
  onChangeVoice,
  narrationTone,
  onChangeTone,
  isSpeaking,
  isLoadingTts,
  ttsError,
  audioProgress,
  audioCurrentTime,
  audioDuration,
  autoReadBook,
  onToggleAutoRead,
  onTogglePlayPage,
  onReplayPage,
  onOpenBuddy,
}) => {
  const page: StoryPage = book.pages[pageIndex] ?? book.pages[0];
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [sceneDraft, setSceneDraft] = useState(page.illustrationPrompt);
  const [styleDraft, setStyleDraft] = useState(book.artStyle);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  useEffect(() => {
    setSceneDraft(page.illustrationPrompt);
    setStyleDraft(book.artStyle);
    setImgLoadFailed(false);
  }, [page.id, page.illustrationPrompt, book.artStyle]);

  useEffect(() => {
    setImgLoadFailed(false);
  }, [page.activeIllustrationUrl]);

  const missingCount = book.pages.filter((p) => !p.activeIllustrationUrl).length;
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === book.pages.length - 1;

  return (
    <section id="reader-section" className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-8 pb-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#786E62] mb-1.5">
            <span>{book.theme}</span>
            <span aria-hidden="true">·</span>
            <span>{book.ageGroup}</span>
            <span aria-hidden="true">·</span>
            <span>{book.artStyle}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C18] text-balance">
            {book.title}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {missingCount > 0 && (
            <button
              type="button"
              onClick={onIllustrateRemainingPages}
              disabled={isGeneratingImage || isBatchIllustrating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8CFC0] bg-white hover:bg-[#F3EFE6] disabled:opacity-50 text-xs sm:text-sm font-medium text-[#1F1C18] transition-colors whitespace-nowrap cursor-pointer"
            >
              {isBatchIllustrating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1E40AF]" />
              ) : (
                <Layers className="w-4 h-4 text-[#B45309]" />
              )}
              {isBatchIllustrating
                ? batchProgressText
                : `Illustrate All (${missingCount} left)`}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBuddy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8CFC0] bg-white hover:bg-[#F3EFE6] text-xs sm:text-sm font-medium text-[#1F1C18] transition-colors whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#1E40AF]" />
            Ask Story Buddy
          </button>
        </div>
      </div>

      <div className="relative bg-white border border-[#E4DDD0] rounded-2xl shadow-xs overflow-hidden">
        <div
          aria-hidden="true"
          className="hidden lg:block pointer-events-none absolute inset-y-0 left-[58.3333%] -translate-x-1/2 w-8 storybook-spine z-10"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Page: Illustration Canvas & 1K/2K/4K Studio */}
          <div className="lg:col-span-7 p-5 sm:p-8 bg-[#FAF8F4] border-b lg:border-b-0 lg:border-r border-[#E4DDD0] flex flex-col justify-between gap-5">
            <div>
              <div className="relative aspect-[4/3] w-full rounded-xl bg-[#F3EFE6] border border-[#E4DDD0] overflow-hidden">
                {isGeneratingImage && (
                  <div className="absolute inset-0 z-20 bg-[#FBF9F5]/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1E40AF] mb-3" />
                    <p className="font-display text-lg font-medium text-[#1F1C18]">
                      Painting Page {page.pageNumber} at {imageSize}...
                    </p>
                    <p className="text-xs text-[#786E62] mt-1 max-w-sm">
                      Creating a custom {styleDraft} illustration for "{page.chapterHeading}".
                    </p>
                  </div>
                )}

                {page.activeIllustrationUrl && !imgLoadFailed ? (
                  <img
                    src={page.activeIllustrationUrl}
                    alt={`Illustration for page ${page.pageNumber}: ${page.chapterHeading}`}
                    referrerPolicy="no-referrer"
                    onError={() => setImgLoadFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F7F4EE] to-[#ECE5D8]">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#E4DDD0] flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6 text-[#B45309]" />
                    </div>
                    <p className="font-display text-xl font-medium text-[#1F1C18] mb-2">
                      Illustration Plate · Page {page.pageNumber}
                    </p>
                    <p className="text-sm text-[#5C5449] max-w-md leading-relaxed mb-5">
                      {page.illustrationPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={() => onGenerateIllustration(sceneDraft, styleDraft)}
                      disabled={isGeneratingImage || isBatchIllustrating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Paintbrush className="w-4 h-4" />
                      Paint Page {page.pageNumber} ({imageSize})
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-[#786E62] px-1">
                <span>
                  Plate {page.pageNumber} · {page.chapterHeading}
                </span>
                <span>{styleDraft}</span>
              </div>
            </div>

            {page.illustrationHistory.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                <span className="text-xs font-medium text-[#786E62] shrink-0">
                  Saved Plates:
                </span>
                {page.illustrationHistory.map((item, idx) => {
                  const isSelected = item.imageUrl === page.activeIllustrationUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectIllustrationVersion(item.imageUrl)}
                      className={`group relative shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#1E40AF] ring-2 ring-[#1E40AF]/20"
                          : "border-[#D8CFC0] hover:border-[#8C8174]"
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={`Variation ${idx + 1} (${item.imageSize})`}
                        referrerPolicy="no-referrer"
                        className="w-16 h-12 object-cover"
                      />
                      <span className="block bg-white/95 text-[10px] font-mono tabular-nums text-[#3D352C] px-1.5 py-0.5 text-center border-t border-[#E4DDD0]">
                        {item.imageSize}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-[#E4DDD0] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[#5C5449]">
                    Image Size
                  </span>
                  <div
                    role="group"
                    aria-label="Illustration resolution"
                    className="inline-flex items-center gap-1 p-1 bg-[#EFEAE0] rounded-lg border border-[#E4DDD0]"
                  >
                    {IMAGE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onChangeImageSize(size)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md tabular-nums transition-colors cursor-pointer ${
                          imageSize === size
                            ? "bg-white text-[#1E40AF] shadow-xs font-semibold"
                            : "text-[#5C5449] hover:text-[#1F1C18]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSceneEditor((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      showSceneEditor
                        ? "border-[#1E40AF] bg-[#1E40AF]/5 text-[#1E40AF]"
                        : "border-[#D8CFC0] bg-white text-[#3D352C] hover:bg-[#F3EFE6]"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Edit Scene
                  </button>

                  <button
                    type="button"
                    onClick={() => onGenerateIllustration(sceneDraft, styleDraft)}
                    disabled={isGeneratingImage || isBatchIllustrating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    New Illustration
                  </button>
                </div>
              </div>

              {showSceneEditor && (
                <div className="p-4 rounded-xl bg-white border border-[#E4DDD0] space-y-3">
                  <div>
                    <label
                      htmlFor="scene-prompt-editor"
                      className="block text-xs font-semibold text-[#1F1C18] mb-1.5"
                    >
                      Scene Description for Page {page.pageNumber}
                    </label>
                    <textarea
                      id="scene-prompt-editor"
                      rows={2}
                      value={sceneDraft}
                      onChange={(e) => setSceneDraft(e.target.value)}
                      className="w-full rounded-lg border border-[#D8CFC0] bg-[#FBF9F5] px-3 py-2 text-xs sm:text-sm text-[#1F1C18] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="scene-style-select"
                        className="text-xs font-medium text-[#5C5449]"
                      >
                        Style:
                      </label>
                      <select
                        id="scene-style-select"
                        value={styleDraft}
                        onChange={(e) => setStyleDraft(e.target.value)}
                        className="rounded-lg border border-[#D8CFC0] bg-[#FBF9F5] px-2.5 py-1.5 text-xs text-[#1F1C18] focus:border-[#1E40AF] focus:outline-none cursor-pointer"
                      >
                        {ART_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGenerateIllustration(sceneDraft, styleDraft)}
                      disabled={isGeneratingImage || !sceneDraft.trim()}
                      className="px-3.5 py-1.5 rounded-lg bg-[#B45309] hover:bg-[#92400E] disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Paint Custom Scene ({imageSize})
                    </button>
                  </div>
                </div>
              )}

              {imageError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#991B1B]"
                >
                  {imageError}
                </div>
              )}
            </div>
          </div>

          {/* Right Page: Story Narrative & Read-Aloud Theater */}
          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between gap-8 bg-white">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EFEAE0] mb-6">
                <span className="text-xs font-mono tabular-nums uppercase tracking-wider text-[#786E62]">
                  Page {String(page.pageNumber).padStart(2, "0")} of{" "}
                  {String(book.pages.length).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium text-[#B45309]">
                  {page.chapterHeading}
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-[28px] font-semibold text-[#1F1C18] mb-5 text-balance leading-snug">
                {page.chapterHeading}
              </h2>

              <p
                className={`text-lg sm:text-[19px] leading-[1.78] text-[#29241E] ${
                  isFirstPage
                    ? "first-letter:text-5xl first-letter:font-display first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#B45309]"
                    : ""
                }`}
              >
                {page.text}
              </p>

              {isLastPage && book.moral && (
                <div className="mt-7 pt-5 border-t border-[#EFEAE0]">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#786E62] mb-1">
                    Story Heart
                  </p>
                  <p className="font-display italic text-base text-[#3D352C]">
                    “{book.moral}”
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Read-Aloud Theater */}
              <div className="rounded-xl bg-[#FAF8F4] border border-[#E4DDD0] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onTogglePlayPage}
                    disabled={isLoadingTts}
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {isLoadingTts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSpeaking ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    {isLoadingTts
                      ? "Preparing Voice..."
                      : isSpeaking
                      ? "Pause Narration"
                      : "Read Page Aloud"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onReplayPage}
                      disabled={isLoadingTts}
                      title="Replay this page"
                      aria-label="Replay this page"
                      className="p-2 rounded-lg border border-[#D8CFC0] bg-white hover:bg-[#F3EFE6] text-[#3D352C] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={onToggleAutoRead}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        autoReadBook
                          ? "border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF] font-semibold"
                          : "border-[#D8CFC0] bg-white text-[#5C5449] hover:text-[#1F1C18]"
                      }`}
                    >
                      {autoReadBook ? "Auto-Read: On" : "Auto-Read: Off"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-[#E4DDD0] overflow-hidden">
                    <div
                      className="h-full bg-[#1E40AF] transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.max(0, audioProgress * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#786E62]">
                    <span>{formatSeconds(audioCurrentTime)}</span>
                    <span>{formatSeconds(audioDuration)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E4DDD0] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="narrator-voice-select"
                      className="text-xs font-medium text-[#5C5449]"
                    >
                      Voice:
                    </label>
                    <select
                      id="narrator-voice-select"
                      value={voiceName}
                      onChange={(e) => onChangeVoice(e.target.value as VoiceName)}
                      className="rounded-lg border border-[#D8CFC0] bg-white px-2.5 py-1 text-xs font-medium text-[#1F1C18] focus:border-[#1E40AF] focus:outline-none cursor-pointer"
                    >
                      {VOICE_OPTIONS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} — {v.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-[#EFEAE0] rounded-lg border border-[#E4DDD0]">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onChangeTone(t.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          narrationTone === t.id
                            ? "bg-white text-[#1F1C18] shadow-xs"
                            : "text-[#5C5449] hover:text-[#1F1C18]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {ttsError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]"
                  >
                    {ttsError}
                  </div>
                )}
              </div>

              {/* Page Turn Controls */}
              <div className="pt-4 border-t border-[#EFEAE0] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectPage(pageIndex - 1)}
                  disabled={isFirstPage}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8CFC0] bg-white hover:bg-[#F3EFE6] disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-medium text-[#1F1C18] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1.5">
                  {book.pages.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPage(idx)}
                      aria-label={`Go to page ${p.pageNumber}`}
                      className={`w-8 h-8 rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                        idx === pageIndex
                          ? "bg-[#1F1C18] text-white"
                          : "bg-[#F3EFE6] text-[#5C5449] hover:bg-[#E4DDD0] hover:text-[#1F1C18]"
                      }`}
                    >
                      {p.pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPage(pageIndex + 1)}
                  disabled={isLastPage}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8CFC0] bg-white hover:bg-[#F3EFE6] disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-medium text-[#1F1C18] transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
