import { jsPDF } from "jspdf";
import type { StoryBook } from "../types/story";

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

function sanitizeTextForPdf(text: string): string {
  // Replace typographic characters outside WinAnsiEncoding if needed while keeping clean punctuation
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, " — ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...");
}

async function loadImageForPdf(url: string | null | undefined): Promise<LoadedImage | null> {
  if (!url) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || 1200;
        const naturalH = img.naturalHeight || 900;
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const targetW = Math.max(1, Math.round(naturalW * scale));
        const targetH = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#FBF9F5";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        resolve({ dataUrl: jpegDataUrl, width: targetW, height: targetH });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function slugifyTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "storyloom-book";
}

function drawFittedImage(
  doc: jsPDF,
  image: LoadedImage,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const imgRatio = image.width / image.height;
  const boxRatio = boxW / boxH;
  let drawW = boxW;
  let drawH = boxH;

  if (imgRatio > boxRatio) {
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;

  doc.setFillColor(243, 239, 230);
  doc.setDrawColor(228, 221, 208);
  doc.setLineWidth(0.35);
  doc.roundedRect(drawX - 2, drawY - 2, drawW + 4, drawH + 4, 2, 2, "FD");
  doc.addImage(image.dataUrl, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
}

export async function exportStoryBookToPdf(book: StoryBook): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm

  // Preload cover + all page illustrations concurrently
  const [coverImg, ...pageImages] = await Promise.all([
    loadImageForPdf(book.coverImageUrl || book.pages[0]?.activeIllustrationUrl),
    ...book.pages.map((p) => loadImageForPdf(p.activeIllustrationUrl)),
  ]);

  // --- COVER PAGE ---
  doc.setFillColor(251, 249, 245);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setDrawColor(228, 221, 208);
  doc.setLineWidth(0.45);
  doc.roundedRect(10, 10, pageW - 20, pageH - 20, 3, 3, "S");

  // Kicker metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(120, 110, 98);
  const coverMeta = sanitizeTextForPdf(
    `${book.theme}  ·  ${book.ageGroup}  ·  ${book.artStyle}`
  );
  doc.text(coverMeta, pageW / 2, 24, { align: "center" });

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(31, 28, 24);
  const titleLines = doc.splitTextToSize(sanitizeTextForPdf(book.title), 220);
  doc.text(titleLines, pageW / 2, 37, { align: "center" });

  const afterTitleY = 37 + titleLines.length * 10;

  // Subtitle
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(92, 84, 73);
  const subtitleLines = doc.splitTextToSize(sanitizeTextForPdf(book.subtitle), 200);
  doc.text(subtitleLines, pageW / 2, afterTitleY + 2, { align: "center" });

  const coverImgTop = Math.max(62, afterTitleY + subtitleLines.length * 6 + 6);
  const coverImgMaxH = pageH - coverImgTop - 26;

  if (coverImg) {
    drawFittedImage(doc, coverImg, (pageW - 150) / 2, coverImgTop, 150, coverImgMaxH);
  } else {
    doc.setFillColor(243, 239, 230);
    doc.setDrawColor(228, 221, 208);
    doc.roundedRect((pageW - 140) / 2, coverImgTop, 140, coverImgMaxH, 3, 3, "FD");
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(120, 110, 98);
    doc.text("Storyloom Illustrated Edition", pageW / 2, coverImgTop + coverImgMaxH / 2, {
      align: "center",
    });
  }

  // Footer colophon on cover
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 98);
  doc.text(
    sanitizeTextForPdf(`Storyloom Picture Book Studio  ·  ${book.pages.length} Pages`),
    pageW / 2,
    pageH - 16,
    { align: "center" }
  );

  // --- STORY SPREAD PAGES ---
  book.pages.forEach((page, idx) => {
    doc.addPage("a4", "landscape");

    // Warm paper background
    doc.setFillColor(251, 249, 245);
    doc.rect(0, 0, pageW, pageH, "F");

    // Outer book frame
    doc.setDrawColor(228, 221, 208);
    doc.setLineWidth(0.4);
    doc.roundedRect(10, 10, pageW - 20, pageH - 20, 2.5, 2.5, "S");

    // Center spine rule
    const midX = pageW / 2;
    doc.setDrawColor(228, 221, 208);
    doc.setLineWidth(0.3);
    doc.line(midX, 14, midX, pageH - 14);

    // Left Page: Illustration Plate (x: 18..140)
    const leftX = 18;
    const leftW = midX - 26;
    const imgBoxY = 24;
    const imgBoxH = 138;
    const pageImg = pageImages[idx];

    if (pageImg) {
      drawFittedImage(doc, pageImg, leftX, imgBoxY, leftW, imgBoxH);
    } else {
      doc.setFillColor(243, 239, 230);
      doc.setDrawColor(228, 221, 208);
      doc.roundedRect(leftX, imgBoxY, leftW, imgBoxH, 2.5, 2.5, "FD");
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(180, 83, 9);
      doc.text(`Illustration Plate ${page.pageNumber}`, leftX + leftW / 2, imgBoxY + 52, {
        align: "center",
      });
      doc.setFont("times", "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(92, 84, 73);
      const sceneLines = doc.splitTextToSize(
        sanitizeTextForPdf(page.illustrationPrompt),
        leftW - 24
      );
      doc.text(sceneLines.slice(0, 6), leftX + leftW / 2, imgBoxY + 64, {
        align: "center",
      });
    }

    // Plate caption below illustration
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 110, 98);
    doc.text(
      sanitizeTextForPdf(`Plate ${page.pageNumber}  ·  ${page.chapterHeading}`),
      leftX + leftW / 2,
      pageH - 20,
      { align: "center" }
    );

    // Right Page: Story Narrative (x: midX + 12 .. pageW - 18)
    const rightX = midX + 12;
    const rightW = pageW - rightX - 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 110, 98);
    doc.text(
      `PAGE ${String(page.pageNumber).padStart(2, "0")} OF ${String(book.pages.length).padStart(
        2,
        "0"
      )}`,
      rightX,
      26
    );

    doc.setDrawColor(239, 234, 224);
    doc.setLineWidth(0.3);
    doc.line(rightX, 30, rightX + rightW, 30);

    // Chapter heading
    doc.setFont("times", "bold");
    doc.setFontSize(19);
    doc.setTextColor(31, 28, 24);
    const headingLines = doc.splitTextToSize(
      sanitizeTextForPdf(page.chapterHeading),
      rightW
    );
    doc.text(headingLines, rightX, 42);

    const proseStartY = 42 + headingLines.length * 8 + 6;

    // Story prose
    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.setTextColor(41, 36, 30);
    const proseLines = doc.splitTextToSize(sanitizeTextForPdf(page.text), rightW);
    doc.text(proseLines, rightX, proseStartY, { lineHeightFactor: 1.55 });

    // Story Heart / Moral on final page
    if (idx === book.pages.length - 1 && book.moral) {
      const moralY = Math.max(proseStartY + proseLines.length * 7.2 + 12, pageH - 46);
      if (moralY < pageH - 22) {
        doc.setDrawColor(228, 221, 208);
        doc.line(rightX, moralY - 6, rightX + rightW, moralY - 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(120, 110, 98);
        doc.text("STORY HEART", rightX, moralY);

        doc.setFont("times", "italic");
        doc.setFontSize(11.5);
        doc.setTextColor(61, 53, 44);
        const moralLines = doc.splitTextToSize(
          sanitizeTextForPdf(`"${book.moral}"`),
          rightW
        );
        doc.text(moralLines, rightX, moralY + 6.5);
      }
    }

    // Book title running footer on right page
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 129, 116);
    doc.text(sanitizeTextForPdf(book.title), rightX + rightW, pageH - 18, {
      align: "right",
    });
  });

  doc.save(`${slugifyTitle(book.title)}.pdf`);
}
