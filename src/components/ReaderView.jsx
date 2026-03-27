import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { HIGHLIGHT_COLORS } from './AnnotationsPanel.jsx';

export default function ReaderView({
  chapter,
  words,
  currentIndex,
  setCurrentIndex,
  playing,
  fontSize,
  fontFamily,
  chapterIndex,
  highlights,
  onAddHighlight,
  bookmarks,
  onToggleBookmark,
}) {
  const containerRef = useRef(null);
  const wordRefs = useRef([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [selection, setSelection] = useState(null); // { startIdx, endIdx }
  const [showColorPicker, setShowColorPicker] = useState(null); // { x, y, startIdx, endIdx, text }

  // Auto-scroll to current word during RSVP
  useEffect(() => {
    if (playing && wordRefs.current[currentIndex]) {
      wordRefs.current[currentIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex, playing]);

  // Scroll to top when chapter changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    wordRefs.current = [];
    setSelection(null);
    setShowColorPicker(null);
  }, [chapter]);

  // Handle text selection for highlighting
  const handleMouseUp = useCallback(() => {
    if (playing) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setShowColorPicker(null);
      return;
    }

    // Find the word indices from the selection
    const anchorSpan = sel.anchorNode?.parentElement;
    const focusSpan = sel.focusNode?.parentElement;

    if (!anchorSpan || !focusSpan) return;

    let startIdx = null;
    let endIdx = null;

    for (let i = 0; i < wordRefs.current.length; i++) {
      if (wordRefs.current[i] === anchorSpan || wordRefs.current[i]?.contains(anchorSpan)) {
        startIdx = i;
      }
      if (wordRefs.current[i] === focusSpan || wordRefs.current[i]?.contains(focusSpan)) {
        endIdx = i;
      }
    }

    if (startIdx === null || endIdx === null) return;
    if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

    const selectedText = words.slice(startIdx, endIdx + 1).map(w => w.text).join(' ');
    if (selectedText.trim().length < 2) return;

    // Position the color picker near the selection
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setShowColorPicker({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + containerRef.current.scrollTop - 10,
      startIdx,
      endIdx,
      text: selectedText,
    });
  }, [playing, words]);

  const handleHighlightColor = useCallback((colorId) => {
    if (!showColorPicker) return;
    onAddHighlight({
      chapterIndex,
      startWordIndex: showColorPicker.startIdx,
      endWordIndex: showColorPicker.endIdx,
      text: showColorPicker.text,
      color: colorId,
    });
    setShowColorPicker(null);
    window.getSelection()?.removeAllRanges();
  }, [showColorPicker, chapterIndex, onAddHighlight]);

  // Build a set of highlighted word indices for fast lookup
  const highlightMap = useMemo(() => {
    const map = {};
    (highlights || [])
      .filter(h => h.chapterIndex === chapterIndex)
      .forEach(h => {
        const hlColor = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
        for (let i = h.startWordIndex; i <= h.endWordIndex; i++) {
          map[i] = hlColor.color;
        }
      });
    return map;
  }, [highlights, chapterIndex]);

  // Build bookmark lookup by paragraph
  const bookmarkSet = useMemo(() => {
    const set = new Set();
    (bookmarks || [])
      .filter(b => b.chapterIndex === chapterIndex)
      .forEach(b => set.add(b.paragraphIndex));
    return set;
  }, [bookmarks, chapterIndex]);

  const content = useMemo(() => {
    if (!chapter) return null;

    let wordIdx = 0;

    return (
      <div>
        <h2 style={{
          fontFamily: 'var(--font-ui)',
          fontSize: fontSize * 1.25,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
          letterSpacing: '-0.01em',
        }}>
          {chapter.title}
        </h2>
        {chapter.paragraphs.map((para, pi) => {
          const paraWords = para.split(/\s+/).filter(w => w);
          const startIdx = wordIdx;
          const isBookmarked = bookmarkSet.has(pi);

          const spans = paraWords.map((word, wi) => {
            const idx = startIdx + wi;
            const isActive = playing && idx === currentIndex;
            const isPast = playing && idx < currentIndex;
            const isHovered = !playing && idx === hoveredIdx;
            const hlColor = highlightMap[idx];

            return (
              <span
                key={idx}
                ref={el => { wordRefs.current[idx] = el; }}
                onClick={() => {
                  if (!playing) setCurrentIndex(idx);
                }}
                onMouseEnter={() => { if (!playing) setHoveredIdx(idx); }}
                onMouseLeave={() => { if (!playing) setHoveredIdx(null); }}
                style={{
                  backgroundColor: isActive
                    ? 'var(--accent-soft)'
                    : hlColor
                      ? hlColor
                      : isHovered
                        ? 'rgba(232, 93, 58, 0.06)'
                        : 'transparent',
                  color: isActive
                    ? 'var(--accent)'
                    : isPast
                      ? 'var(--text-muted)'
                      : 'var(--text-primary)',
                  borderRadius: 3,
                  padding: '1px 1px',
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                  fontWeight: isActive ? 600 : 400,
                  cursor: playing ? 'default' : 'text',
                  borderBottom: isHovered && !hlColor ? '1px dashed var(--accent)' : '1px solid transparent',
                }}
              >
                {word}{' '}
              </span>
            );
          });

          wordIdx += paraWords.length;

          return (
            <div key={pi} style={{
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
              marginBottom: '0.4em',
            }}>
              {/* Bookmark gutter */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(chapterIndex, pi, startIdx, para.slice(0, 60));
                }}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this paragraph'}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 0 0 0',
                  fontSize: 14,
                  lineHeight: 1.8,
                  cursor: 'pointer',
                  opacity: isBookmarked ? 1 : 0.15,
                  transition: 'opacity 0.15s ease',
                  flexShrink: 0,
                  width: 18,
                  textAlign: 'center',
                  color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { if (!isBookmarked) e.currentTarget.style.opacity = 0.15; }}
              >
                {isBookmarked ? '●' : '○'}
              </button>
              <p style={{
                marginBottom: '0.5em',
                textAlign: 'justify',
                hyphens: 'auto',
                flex: 1,
              }}>
                {spans}
              </p>
            </div>
          );
        })}
      </div>
    );
  }, [chapter, currentIndex, playing, fontSize, setCurrentIndex, hoveredIdx, highlightMap, bookmarkSet, chapterIndex, onToggleBookmark]);

  if (!chapter) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
      }}>
        No book loaded
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 40px',
        fontFamily: `'${fontFamily}', Georgia, serif`,
        fontSize,
        lineHeight: 1.8,
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      {content}

      {/* Color picker popup for highlights */}
      {showColorPicker && (
        <div style={{
          position: 'absolute',
          top: showColorPicker.y - 40,
          left: Math.max(20, Math.min(showColorPicker.x - 75, 300)),
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          padding: '6px 8px',
          display: 'flex',
          gap: 6,
          zIndex: 50,
        }}>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleHighlightColor(c.id)}
              title={c.label}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: c.color.replace(/[\d.]+\)$/, '0.7)'),
                border: '2px solid var(--border)',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
          <button
            onClick={() => { setShowColorPicker(null); window.getSelection()?.removeAllRanges(); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
