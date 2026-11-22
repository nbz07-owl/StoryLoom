import React, { useState } from "react";
import { BookOpen, FileDown, Loader2, Trash2 } from "lucide-react";
import type { StoryBook } from "../types/story";

interface LibraryShelfProps {
  books: StoryBook[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  exportingBookId: string | null;
  onExportPdf: (book: StoryBook) => void;
}

const BookCoverImage: React.FC<{ src: string; alt: string; title: string }> = ({
  src,
  alt,
  title,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#EFEAE0] to-[#E3DBC9] flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-8 h-8 text-[#8C7B65] mb-2" />
        <span className="font-display text-base font-medium text-[#3D352C]">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
};

export const LibraryShelf: React.FC<LibraryShelfProps> = ({
  books,
  activeBookId,
  onSelectBook,
  onDeleteBook,
  exportingBookId,
  onExportPdf,
}) => {
  return (
    <section
      id="library-section"
      className="max-w-[1360px] mx-auto px-4 sm:px-8 py-14 border-t border-[#E4DDD0]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#786E62] mb-1.5">
            Reading Shelf
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#1F1C18] text-balance">
            Illustrated Storybooks
          </h2>
        </div>
        <p className="text-sm text-[#5C5449] max-w-md">
          Open any book to hear every page read aloud or paint fresh illustrations at 1K, 2K, or 4K detail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {books.map((book) => {
          const isActive = book.id === activeBookId;
          const illustratedCount = book.pages.filter((p) => Boolean(p.activeIllustrationUrl)).length;

          return (
            <article
              key={book.id}
              className={`group flex flex-col bg-white rounded-xl border transition-colors overflow-hidden ${
                isActive
                  ? "border-[#1E40AF] shadow-sm"
                  : "border-[#E4DDD0] hover:border-[#C5BBA8]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectBook(book.id)}
                className="text-left flex-1 flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1E40AF]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F3EFE6] border-b border-[#E4DDD0]">
                  <BookCoverImage
                    src={book.coverImageUrl}
                    alt={`Cover illustration for ${book.title}`}
                    title={book.title}
                  />
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-[#786E62] mb-2">
                    <span>{book.theme}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.ageGroup}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {illustratedCount}/{book.pages.length} Illustrated
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-[#1F1C18] mb-1.5 group-hover:text-[#1E40AF] transition-colors">
                    {book.title}
                  </h3>

                  <p className="text-sm text-[#5C5449] leading-relaxed line-clamp-2 mb-4">
                    {book.subtitle}
                  </p>

                  <div className="mt-auto pt-4 border-t border-[#F0EAE0] flex items-center justify-between text-xs font-medium">
                    <span className={isActive ? "text-[#1E40AF]" : "text-[#3D352C]"}>
                      {isActive ? "Currently Reading" : "Open Book"}
                    </span>
                    <span className="text-[#786E62]">{book.artStyle}</span>
                  </div>
                </div>
              </button>

              <div className="px-6 py-2.5 bg-[#FAF8F4] border-t border-[#E4DDD0] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onExportPdf(book)}
                  disabled={exportingBookId === book.id}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E40AF] hover:underline disabled:opacity-50 transition-colors cursor-pointer py-1 whitespace-nowrap"
                >
                  {exportingBookId === book.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  {exportingBookId === book.id ? "Building PDF..." : "Download PDF"}
                </button>

                {!book.isStarter && (
                  <button
                    type="button"
                    onClick={() => onDeleteBook(book.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#786E62] hover:text-[#B91C1C] transition-colors cursor-pointer py-1 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Book
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
