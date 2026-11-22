import React, { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { STUDIO_BANNER_IMAGE } from "../data/starterStories";
import { ART_STYLES, IMAGE_SIZES } from "../types/story";
import type { ImageSize } from "../types/story";

interface CreateStorySectionProps {
  isCreating: boolean;
  creationStatus: string;
  error: string | null;
  onCreateStory: (params: {
    idea: string;
    characterName: string;
    ageGroup: string;
    pageCount: number;
    artStyle: string;
    imageSize: ImageSize;
    includeTrailerVideo: boolean;
  }) => void;
}

const STORY_SEEDS = [
  "A shy little hedgehog who collects fallen starlight in glass jars",
  "A curious library dragon who sneezes colorful paper confetti",
  "Two raindrop twins racing from a thundercloud down to the sea",
  "A woodland baker mouse crafting a birthday cake for the moon",
];

const AGE_GROUPS = ["Ages 3–5", "Ages 6–8", "Ages 9–11"];
const PAGE_COUNTS = [3, 4, 5];

export const CreateStorySection: React.FC<CreateStorySectionProps> = ({
  isCreating,
  creationStatus,
  error,
  onCreateStory,
}) => {
  const [idea, setIdea] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [ageGroup, setAgeGroup] = useState("Ages 6–8");
  const [pageCount, setPageCount] = useState(4);
  const [artStyle, setArtStyle] = useState<string>(ART_STYLES[0]);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [includeTrailerVideo, setIncludeTrailerVideo] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || isCreating) return;
    onCreateStory({
      idea: idea.trim(),
      characterName: characterName.trim(),
      ageGroup,
      pageCount,
      artStyle,
      imageSize,
      includeTrailerVideo,
    });
  };

  return (
    <section
      id="create-section"
      className="max-w-[1360px] mx-auto px-4 sm:px-8 py-14 border-t border-[#E4DDD0]"
    >
      <div className="bg-white border border-[#E4DDD0] rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-5 bg-[#F3EFE6] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E4DDD0]">
          <div className="aspect-[16/10] lg:aspect-auto lg:h-72 w-full overflow-hidden bg-[#EAE3D5]">
            {!bannerFailed ? (
              <img
                src={STUDIO_BANNER_IMAGE}
                alt="Open clothbound storybook resting beside watercolor paints and brushes"
                referrerPolicy="no-referrer"
                onError={() => setBannerFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 text-center">
                <Palette className="w-10 h-10 text-[#8C7B65]" />
              </div>
            )}
          </div>

          <div className="p-7 sm:p-9 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#786E62] mb-2">
                Storybook Workshop
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#1F1C18] mb-3 text-balance">
                Write & Illustrate a Brand-New Book
              </h2>
              <p className="text-sm text-[#5C5449] leading-relaxed mb-6">
                Describe any dream, creature, or bedtime adventure. Storyloom writes every chapter and paints a fresh custom illustration for every single page at your chosen resolution.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-[#5C5449] mb-2.5">
                Try a story spark:
              </p>
              <div className="flex flex-col gap-2">
                {STORY_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setIdea(seed)}
                    className="text-left text-xs sm:text-sm text-[#3D352C] hover:text-[#1E40AF] bg-white/80 hover:bg-white border border-[#E4DDD0] rounded-lg px-3.5 py-2.5 transition-colors cursor-pointer"
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="story-idea-input"
                className="block text-sm font-semibold text-[#1F1C18] mb-2"
              >
                What is your story about?
              </label>
              <textarea
                id="story-idea-input"
                rows={3}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Example: A little lantern-maker fox who helps lost fireflies find their way home before dawn..."
                className="w-full rounded-xl border border-[#D8CFC0] bg-[#FBF9F5] px-4 py-3 text-sm text-[#1F1C18] placeholder:text-[#8C8174] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="character-name-input"
                  className="block text-sm font-semibold text-[#1F1C18] mb-2"
                >
                  Main Character Name (optional)
                </label>
                <input
                  id="character-name-input"
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g., Oliver, Maya, Pip"
                  className="w-full rounded-lg border border-[#D8CFC0] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1F1C18] placeholder:text-[#8C8174] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="art-style-select"
                  className="block text-sm font-semibold text-[#1F1C18] mb-2"
                >
                  Illustration Medium
                </label>
                <select
                  id="art-style-select"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CFC0] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1F1C18] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                >
                  {ART_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <span className="block text-sm font-semibold text-[#1F1C18] mb-2">
                  Reading Age
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg border border-[#E4DDD0]">
                  {AGE_GROUPS.map((age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setAgeGroup(age)}
                      className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        ageGroup === age
                          ? "bg-white text-[#1F1C18] shadow-xs"
                          : "text-[#5C5449] hover:text-[#1F1C18]"
                      }`}
                    >
                      {age.replace("Ages ", "")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold text-[#1F1C18] mb-2">
                  Book Length
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg border border-[#E4DDD0]">
                  {PAGE_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setPageCount(count)}
                      className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors tabular-nums whitespace-nowrap cursor-pointer ${
                        pageCount === count
                          ? "bg-white text-[#1F1C18] shadow-xs"
                          : "text-[#5C5449] hover:text-[#1F1C18]"
                      }`}
                    >
                      {count} Pages
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold text-[#1F1C18] mb-2">
                  Illustration Size
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg border border-[#E4DDD0]">
                  {IMAGE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors tabular-nums whitespace-nowrap cursor-pointer ${
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
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#E4DDD0] bg-[#FAF8F4] px-4 py-3 cursor-pointer hover:border-[#C5BBA8] transition-colors">
              <input
                type="checkbox"
                checked={includeTrailerVideo}
                onChange={(e) => setIncludeTrailerVideo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#C5BBA8] text-[#1E40AF] focus:ring-[#1E40AF] cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-[#3D352C] leading-snug">
                <strong className="font-semibold text-[#1F1C18]">
                  Also animate Page 1 into a story video
                </strong>{" "}
                — generates a 5s animated scene from Page 1's illustration right after painting.
              </span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
            >
              {error}
            </div>
          )}

          <div className="pt-2 border-t border-[#EFEAE0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-[#786E62]">
              {isCreating
                ? creationStatus
                : `Creates ${pageCount} illustrated pages at ${imageSize} quality.`}
            </p>
            <button
              type="submit"
              disabled={isCreating || !idea.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isCreating ? "Creating Book..." : "Write & Illustrate Story"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
