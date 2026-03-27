import JSZip from 'jszip';

const BODY_TAGS = new Set(['p', 'blockquote', 'li', 'dd', 'dt', 'figcaption']);
const SKIP_TAGS = new Set(['nav', 'header', 'footer', 'aside', 'script', 'style', 'sup']);
const SKIP_PATTERNS = /page[-_]?num|header|footer|running[-_]?head|nav|sidebar|toc|copyright/i;

function shouldSkipElement(el) {
  if (SKIP_TAGS.has(el.tagName?.toLowerCase())) return true;
  const cls = (el.className || '') + ' ' + (el.getAttribute?.('role') || '');
  if (SKIP_PATTERNS.test(cls)) return true;
  if (el.getAttribute?.('aria-hidden') === 'true') return true;
  return false;
}

function extractTextFromNode(node, bookTitle, bookAuthor) {
  if (node.nodeType === 3) return node.textContent.trim();
  if (node.nodeType !== 1) return '';
  if (shouldSkipElement(node)) return '';

  const tag = node.tagName?.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    const text = node.textContent.trim();
    if (bookTitle && text.toLowerCase() === bookTitle.toLowerCase()) return '';
    if (bookAuthor && text.toLowerCase() === bookAuthor.toLowerCase()) return '';
    return text;
  }

  if (BODY_TAGS.has(tag)) {
    return node.textContent.trim();
  }

  let result = [];
  for (const child of node.childNodes) {
    const t = extractTextFromNode(child, bookTitle, bookAuthor);
    if (t) result.push(t);
  }
  return result.join('\n');
}

function filterHeuristic(paragraphs, bookTitle, bookAuthor) {
  return paragraphs.filter(p => {
    const trimmed = p.trim();
    if (!trimmed) return false;
    if (/^\d{1,5}$/.test(trimmed)) return false;
    if (/^page\s+\d+/i.test(trimmed)) return false;
    if (bookTitle && trimmed.toLowerCase() === bookTitle.toLowerCase()) return false;
    if (bookAuthor && trimmed.toLowerCase() === bookAuthor.toLowerCase()) return false;
    return true;
  });
}

function parseXml(xmlString) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(xmlString, 'application/xhtml+xml');
  if (doc.querySelector('parsererror')) {
    doc = parser.parseFromString(xmlString, 'text/html');
  }
  return doc;
}

export async function parseEpub(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Find rootfile from container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: missing container.xml');
  const containerXml = await containerFile.async('string');
  const containerDoc = parseXml(containerXml);
  const rootfilePath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
  if (!rootfilePath) throw new Error('Invalid EPUB: no rootfile found');

  // 2. Parse OPF
  const opfFile = zip.file(rootfilePath);
  if (!opfFile) throw new Error('Invalid EPUB: OPF not found at ' + rootfilePath);
  const opfContent = await opfFile.async('string');
  const opfDoc = parseXml(opfContent);
  const basePath = rootfilePath.split('/').slice(0, -1).join('/');

  // 3. Metadata
  const getMeta = (tag) => {
    const selectors = [`metadata ${tag}`, `metadata dc\\:${tag}`, `metadata DC\\:${tag}`];
    for (const sel of selectors) {
      const el = opfDoc.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return '';
  };
  const title = getMeta('title');
  const author = getMeta('creator');

  // 4. Manifest
  const manifest = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href: item.getAttribute('href'),
      type: item.getAttribute('media-type') || '',
    };
  });

  // 5. Spine order
  const spineRefs = Array.from(opfDoc.querySelectorAll('spine itemref')).map(el => el.getAttribute('idref'));

  // 6. TOC
  const toc = [];
  // Try NCX (EPUB2) - more common
  const ncxItem = Object.values(manifest).find(m => m.type?.includes('ncx') || m.href?.endsWith('.ncx'));
  if (ncxItem) {
    try {
      const ncxPath = basePath ? basePath + '/' + ncxItem.href : ncxItem.href;
      const ncxFile = zip.file(ncxPath);
      if (ncxFile) {
        const ncxXml = await ncxFile.async('string');
        const ncxDoc = parseXml(ncxXml);
        ncxDoc.querySelectorAll('navPoint').forEach((np, i) => {
          const label = np.querySelector('navLabel text')?.textContent?.trim() || '';
          const src = np.querySelector('content')?.getAttribute('src')?.split('#')[0] || '';
          if (label) toc.push({ id: i, label, href: src });
        });
      }
    } catch (e) { console.warn('NCX parse error:', e); }
  }
  // Try nav (EPUB3) if no NCX
  if (toc.length === 0) {
    const navItem = Object.values(manifest).find(m =>
      m.href?.includes('nav') && m.type?.includes('html')
    );
    if (navItem) {
      try {
        const navPath = basePath ? basePath + '/' + navItem.href : navItem.href;
        const navFile = zip.file(navPath);
        if (navFile) {
          const navHtml = await navFile.async('string');
          const navDoc = parseXml(navHtml);
          navDoc.querySelectorAll('a').forEach((a, i) => {
            const label = a.textContent.trim();
            const href = a.getAttribute('href')?.split('#')[0] || '';
            if (label && href) toc.push({ id: i, label, href });
          });
        }
      } catch (e) { console.warn('Nav parse error:', e); }
    }
  }

  // 7. Parse spine items
  const chapters = [];

  for (const idref of spineRefs) {
    const item = manifest[idref];
    if (!item) continue;
    if (!item.type?.includes('html') && !item.type?.includes('xml')) continue;

    const fullPath = basePath ? basePath + '/' + item.href : item.href;
    const file = zip.file(fullPath);
    if (!file) continue;

    try {
      const html = await file.async('string');
      const doc = parseXml(html);
      const body = doc.querySelector('body') || doc.documentElement;

      const rawText = extractTextFromNode(body, title, author);
      const paragraphs = rawText.split('\n').filter(p => p.trim());
      const filtered = filterHeuristic(paragraphs, title, author);
      if (filtered.length === 0) continue;

      const tocEntry = toc.find(t =>
        item.href?.includes(t.href) || t.href?.includes(item.href)
      );
      const chapterTitle = tocEntry?.label || 'Section ' + (chapters.length + 1);

      chapters.push({
        id: chapters.length,
        title: chapterTitle,
        paragraphs: filtered,
      });
    } catch (e) {
      console.warn('Error parsing ' + fullPath + ':', e);
      continue;
    }
  }

  // 8. Word list
  const words = [];
  chapters.forEach((ch, ci) => {
    ch.paragraphs.forEach((para, pi) => {
      para.split(/\s+/).filter(w => w).forEach((word, wi) => {
        words.push({
          text: word,
          chapterIndex: ci,
          paragraphIndex: pi,
          wordInParagraph: wi,
          globalIndex: words.length,
        });
      });
    });
  });

  return {
    title: title || 'Untitled',
    author: author || 'Unknown Author',
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
