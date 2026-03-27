import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function isHeaderOrFooter(item, pageHeight) {
  const y = item.transform[5];
  const topMargin = pageHeight * 0.08;
  const bottomMargin = pageHeight * 0.08;
  return y > pageHeight - topMargin || y < bottomMargin;
}

function isPageNumber(text) {
  const trimmed = text.trim();
  if (/^\d{1,5}$/.test(trimmed)) return true;
  if (/^[-—]\s*\d{1,5}\s*[-—]$/.test(trimmed)) return true;
  if (/^page\s+\d+/i.test(trimmed)) return true;
  return false;
}

function groupTextIntoLines(items, pageHeight) {
  // Sort by Y (top to bottom) then X (left to right)
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5]; // PDF Y is bottom-up
    if (Math.abs(yDiff) > 5) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const item of sorted) {
    const y = Math.round(item.transform[5]);
    if (currentY === null || Math.abs(y - currentY) > 3) {
      if (currentLine.length > 0) {
        lines.push({
          text: currentLine.map(i => i.str).join(' '),
          y: currentY,
          fontSize: currentLine[0]?.transform[0] || 12,
        });
      }
      currentLine = [item];
      currentY = y;
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine.map(i => i.str).join(' '),
      y: currentY,
      fontSize: currentLine[0]?.transform[0] || 12,
    });
  }

  return lines;
}

export async function parsePdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  // Collect all font sizes to determine body text size
  const allFontSizes = [];
  const allPages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const lines = groupTextIntoLines(textContent.items, viewport.height);

    lines.forEach(l => {
      if (l.text.trim()) allFontSizes.push(l.fontSize);
    });

    allPages.push({ lines, pageHeight: viewport.height });
  }

  // Most common font size is body text
  const fontSizeFreq = {};
  allFontSizes.forEach(s => {
    const rounded = Math.round(s);
    fontSizeFreq[rounded] = (fontSizeFreq[rounded] || 0) + 1;
  });
  const bodyFontSize = Number(
    Object.entries(fontSizeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 12
  );

  // Detect repeated header/footer strings across pages
  const topStrings = {};
  const bottomStrings = {};
  allPages.forEach(({ lines, pageHeight }) => {
    lines.forEach(l => {
      if (l.y > pageHeight * 0.9) {
        topStrings[l.text.trim()] = (topStrings[l.text.trim()] || 0) + 1;
      }
      if (l.y < pageHeight * 0.1) {
        bottomStrings[l.text.trim()] = (bottomStrings[l.text.trim()] || 0) + 1;
      }
    });
  });

  const repeatedHeaders = new Set(
    Object.entries({ ...topStrings, ...bottomStrings })
      .filter(([_, count]) => count > 2)
      .map(([text]) => text)
  );

  // Extract chapters heuristically (large font = chapter heading)
  const chapters = [];
  let currentChapter = null;
  let currentParagraph = '';

  allPages.forEach(({ lines, pageHeight }) => {
    lines.forEach(line => {
      const text = line.text.trim();
      if (!text) return;

      // Skip page numbers
      if (isPageNumber(text)) return;

      // Skip repeated headers/footers
      if (repeatedHeaders.has(text)) return;

      // Skip header/footer by position
      if (line.y > pageHeight * 0.93 || line.y < pageHeight * 0.05) return;

      // Chapter heading detection: significantly larger font
      if (line.fontSize > bodyFontSize * 1.3 && text.length < 100) {
        // Save current paragraph
        if (currentParagraph.trim() && currentChapter) {
          currentChapter.paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = '';

        // Start new chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        currentChapter = {
          id: chapters.length,
          title: text,
          paragraphs: [],
        };
        return;
      }

      // Body text
      if (!currentChapter) {
        currentChapter = {
          id: 0,
          title: 'Beginning',
          paragraphs: [],
        };
      }

      // Simple paragraph detection: gap in Y coordinates would be better
      // but for now, treat each substantial line break as paragraph boundary
      currentParagraph += (currentParagraph ? ' ' : '') + text;
    });

    // End of page: likely paragraph break
    if (currentParagraph.trim() && currentChapter) {
      currentChapter.paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  });

  if (currentParagraph.trim() && currentChapter) {
    currentChapter.paragraphs.push(currentParagraph.trim());
  }
  if (currentChapter && currentChapter.paragraphs.length > 0) {
    chapters.push(currentChapter);
  }

  // Build word list
  const words = [];
  chapters.forEach((ch, ci) => {
    ch.paragraphs.forEach((para, pi) => {
      const paraWords = para.split(/\s+/).filter(w => w);
      paraWords.forEach((word) => {
        words.push({
          text: word,
          chapterIndex: ci,
          paragraphIndex: pi,
          wordInParagraph: words.length,
          globalIndex: words.length,
        });
      });
    });
  });

  // Try to get title from metadata
  let title = 'Untitled PDF';
  let author = 'Unknown Author';
  try {
    const meta = await pdf.getMetadata();
    title = meta?.info?.Title || title;
    author = meta?.info?.Author || author;
  } catch (e) {}

  const toc = chapters.map((ch, i) => ({
    id: i,
    label: ch.title,
    href: `#chapter-${i}`,
  }));

  return {
    title,
    author,
    chapters,
    words,
    toc,
    fileHash: await hashArrayBuffer(arrayBuffer),
  };
}

async function hashArrayBuffer(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
