import { parseEpub } from './epubParser.js';
import { parsePdf } from './pdfParser.js';
import { parsePlainText } from './textParser.js';

export async function parseFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  let result;
  if (name.endsWith('.epub')) {
    result = await parseEpub(arrayBuffer);
  } else if (name.endsWith('.pdf')) {
    result = await parsePdf(arrayBuffer);
  } else if (name.endsWith('.txt') || name.endsWith('.text') || name.endsWith('.md')) {
    result = await parsePlainText(arrayBuffer);
  } else {
    throw new Error('Unsupported file type: ' + file.name);
  }

  // Strip the global words array from parsers - App builds it per-chapter now
  // Keep chapters, toc, title, author, fileHash
  return {
    title: result.title,
    author: result.author,
    chapters: result.chapters,
    toc: result.toc,
    fileHash: result.fileHash,
  };
}

export function getSupportedExtensions() {
  return ['.epub', '.pdf', '.txt', '.text', '.md'];
}
