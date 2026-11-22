import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Volume2, X } from "lucide-react";
import { CHAT_MODES } from "../types/story";
import type { ChatMessage, ChatMode, StoryBook, StoryPage } from "../types/story";

interface StoryBuddyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book: StoryBook;
  currentPage: StoryPage;
  messages: ChatMessage[];
  chatMode: ChatMode;
  onChangeMode: (mode: ChatMode) => void;
  onSendMessage: (text: string) => Promise<void>;
  onResetChat: () => void;
  onSpeakReply: (messageId: string, text: string) => void;
  speakingMessageId: string | null;
  isSending: boolean;
  chatError: string | null;
}

const STARTER_PROMPTS: Record<ChatMode, string[]> = {
  companion: [
    "What do you think the character is feeling right now?",
    "Tell me a fun detail hidden in this scene!",
  ],
  quick: [
    "Explain any tricky words on this page simply",
    "Make up a 2-line rhyme about this page!",
  ],
  coauthor: [
    "Give me 2 surprise plot twists for what happens next",
    "Help me add a funny animal friend to this page",
  ],
  guide: [
    "What gentle lesson does this story teach?",
    "Give me a clever riddle inspired by this chapter",
  ],
};

export const StoryBuddyDrawer: React.FC<StoryBuddyDrawerProps> = ({
  isOpen,
  onClose,
  book,
  currentPage,
  messages,
  chatMode,
  onChangeMode,
  onSendMessage,
  onResetChat,
  onSpeakReply,
  speakingMessageId,
  isSending,
  chatError,
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  if (!isOpen) return null;

  const activeModeMeta = CHAT_MODES.find((m) => m.id === chatMode) ?? CHAT_MODES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput("");
    await onSendMessage(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1F1C18]/30 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Story Buddy Chat"
    >
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <aside className="w-full max-w-[460px] h-full bg-[#FBF9F5] border-l border-[#E4DDD0] shadow-xl flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-[#E4DDD0] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-[#1F1C18]">
              Story Buddy
            </h2>
            <p className="text-xs text-[#786E62] truncate">
              {book.title} · Page {currentPage.pageNumber} of {book.pages.length}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetChat}
              title="Start new conversation"
              className="p-2 rounded-lg text-[#5C5449] hover:text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Story Buddy"
              className="p-2 rounded-lg text-[#5C5449] hover:text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#F3EFE6] border-b border-[#E4DDD0]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-[#E7E0D2] rounded-lg mb-2">
            {CHAT_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onChangeMode(mode.id)}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  chatMode === mode.id
                    ? "bg-white text-[#1E40AF] shadow-xs font-semibold"
                    : "text-[#5C5449] hover:text-[#1F1C18]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#5C5449]">
            <span className="font-medium text-[#1F1C18]">{activeModeMeta.label}:</span>{" "}
            {activeModeMeta.summary}
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6 space-y-5">
              <div className="bg-white border border-[#E4DDD0] rounded-xl p-5">
                <p className="font-display text-lg font-medium text-[#1F1C18] mb-1.5">
                  Hello, reader!
                </p>
                <p className="text-sm text-[#5C5449] leading-relaxed">
                  Ask me about <span className="font-medium text-[#1F1C18]">{currentPage.chapterHeading}</span>, explore tricky words, invent new plot twists, or solve a riddle together.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#786E62]">
                  Conversation starters
                </p>
                {STARTER_PROMPTS[chatMode].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="w-full text-left text-sm text-[#3D352C] hover:text-[#1E40AF] bg-white hover:bg-[#F3EFE6]/50 border border-[#E4DDD0] rounded-xl px-4 py-3 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#1E40AF] text-white"
                        : "bg-white border border-[#E4DDD0] text-[#1F1C18]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {!isUser && (
                    <div className="mt-1.5 flex items-center gap-3 px-1 text-xs text-[#786E62]">
                      {msg.roleTitle && <span>{msg.roleTitle}</span>}
                      <button
                        type="button"
                        onClick={() => onSpeakReply(msg.id, msg.text)}
                        className="inline-flex items-center gap-1 text-[#1E40AF] hover:underline font-medium cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        {speakingMessageId === msg.id ? "Playing..." : "Read aloud"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-start">
              <div className="bg-white border border-[#E4DDD0] rounded-2xl px-4 py-3 text-sm text-[#5C5449] inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#1E40AF]" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          {chatError && (
            <div
              role="alert"
              className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]"
            >
              {chatError}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 bg-white border-t border-[#E4DDD0] flex items-center gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${activeModeMeta.label} about Page ${currentPage.pageNumber}...`}
            className="flex-1 rounded-xl border border-[#D8CFC0] bg-[#FBF9F5] px-4 py-2.5 text-sm text-[#1F1C18] placeholder:text-[#8C8174] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-45 disabled:cursor-not-allowed text-white transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
};
