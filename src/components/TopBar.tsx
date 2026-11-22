import React from "react";

interface TopBarProps {
  onNavigate: (section: "reader" | "library" | "create" | "buddy") => void;
  activeSection: "reader" | "library" | "create" | "buddy";
}

export const TopBar: React.FC<TopBarProps> = ({ onNavigate, activeSection }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-[#E4DDD0]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate("reader")}
          className="font-display text-2xl font-semibold tracking-tight text-[#1F1C18] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E40AF] cursor-pointer"
        >
          Storyloom
        </button>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5449]">
          <button
            type="button"
            onClick={() => onNavigate("reader")}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer hover:text-[#1F1C18] ${
              activeSection === "reader"
                ? "text-[#1F1C18] underline decoration-[#1E40AF] decoration-2 underline-offset-8"
                : ""
            }`}
          >
            Storybook
          </button>
          <button
            type="button"
            onClick={() => onNavigate("library")}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer hover:text-[#1F1C18] ${
              activeSection === "library"
                ? "text-[#1F1C18] underline decoration-[#1E40AF] decoration-2 underline-offset-8"
                : ""
            }`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => onNavigate("create")}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer hover:text-[#1F1C18] ${
              activeSection === "create"
                ? "text-[#1F1C18] underline decoration-[#1E40AF] decoration-2 underline-offset-8"
                : ""
            }`}
          >
            Workshop
          </button>
          <button
            type="button"
            onClick={() => onNavigate("buddy")}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer hover:text-[#1F1C18] ${
              activeSection === "buddy"
                ? "text-[#1F1C18] underline decoration-[#1E40AF] decoration-2 underline-offset-8"
                : ""
            }`}
          >
            Story Buddy
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("create")}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
          >
            New Story
          </button>
        </div>
      </div>
    </header>
  );
};
