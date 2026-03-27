export async function parsePlainText(arrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(arrayBuffer);

  // Split into paragraphs by double newlines
  const rawParagraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);

  // Heuristic chapter detection: lines that are short, possibly uppercase or numbered
  const chapters = [];
  let currentChapter = {
    id: 0,
    title: 'Beginning',
    paragraphs: [],
  };

  for (const para of rawParagraphs) {
    const lines = para.split('\n').map(l => l.trim());

    // Check if this paragraph looks like a chapter heading
    const isHeading =
      lines.length === 1 &&
      lines[0].length < 80 &&
      (/^(chapter|part|book|section|prologue|epilogue|introduction|preface)\s/i.test(lines[0]) ||
        /^[IVXLCDM]+\.?\s/i.test(lines[0]) ||
        /^\d{1,3}[\.\)]\s/.test(lines[0]) ||
        (lines[0] === lines[0].toUpperCase() && lines[0].length > 2 && lines[0].length < 60));

    if (isHeading) {
      if (currentChapter.paragraphs.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        id: chapters.length,
        title: lines[0],
        paragraphs: [],
      };
    } else {
      currentChapter.paragraphs.push(para.replace(/\n/g, ' '));
    }
  }

  if (currentChapter.paragraphs.length > 0) {
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

  // Guess title from first line
  const firstLine = text.split('\n').find(l => l.trim())?.trim() || 'Untitled';
  const title = firstLine.length < 100 ? firstLine : 'Untitled';

  const toc = chapters.map((ch, i) => ({
    id: i,
    label: ch.title,
    href: `#chapter-${i}`,
  }));

  return {
    title,
    author: 'Unknown Author',
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
