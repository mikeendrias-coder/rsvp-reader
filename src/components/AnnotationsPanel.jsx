import React, { useState } from 'react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', color: 'rgba(255, 235, 59, 0.35)', label: 'Yellow' },
  { id: 'green', color: 'rgba(76, 175, 80, 0.3)', label: 'Green' },
  { id: 'blue', color: 'rgba(66, 165, 245, 0.3)', label: 'Blue' },
  { id: 'pink', color: 'rgba(236, 64, 122, 0.25)', label: 'Pink' },
  { id: 'orange', color: 'rgba(255, 152, 0, 0.3)', label: 'Orange' },
];

export { HIGHLIGHT_COLORS };

export default function AnnotationsPanel({
  open,
  onClose,
  bookmarks,
  highlights,
  onDeleteBookmark,
  onDeleteHighlight,
  onNavigateBookmark,
  onNavigateHighlight,
  chapters,
}) {
  const [tab, setTab] = useState('bookmarks');

  if (!open) return null;

  const tabStyle = (active) => ({
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: active ? 'none' : '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 340,
        background: 'var(--bg-primary)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTab('bookmarks')} style={tabStyle(tab === 'bookmarks')}>
              Bookmarks ({bookmarks.length})
            </button>
            <button onClick={() => setTab('highlights')} style={tabStyle(tab === 'highlights')}>
              Highlights ({highlights.length})
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--text-muted)',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {tab === 'bookmarks' && (
            bookmarks.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                No bookmarks yet. Click the bookmark icon next to any paragraph to add one.
              </div>
            ) : (
              bookmarks
                .sort((a, b) => a.chapterIndex - b.chapterIndex || a.wordIndex - b.wordIndex)
                .map(bm => (
                  <div
                    key={bm.id}
                    style={{
                      padding: '10px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => onNavigateBookmark(bm)}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        fontSize: 11,
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                        marginBottom: 3,
                      }}>
                        {chapters?.[bm.chapterIndex]?.title || `Ch ${bm.chapterIndex + 1}`}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                      }}>
                        {bm.label}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                      }}>
                        {new Date(bm.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: 14,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        flexShrink: 0,
                      }}
                      title="Remove bookmark"
                    >
                      ×
                    </button>
                  </div>
                ))
            )
          )}

          {tab === 'highlights' && (
            highlights.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                No highlights yet. Select text in the reader to highlight it.
              </div>
            ) : (
              highlights
                .sort((a, b) => a.chapterIndex - b.chapterIndex || a.startWordIndex - b.startWordIndex)
                .map(hl => {
                  const hlColor = HIGHLIGHT_COLORS.find(c => c.id === hl.color) || HIGHLIGHT_COLORS[0];
                  return (
                    <div
                      key={hl.id}
                      style={{
                        padding: '10px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        borderLeft: `3px solid ${hlColor.color.replace(/[\d.]+\)$/, '0.8)')}`,
                      }}
                    >
                      <button
                        onClick={() => onNavigateHighlight(hl)}
                        style={{
                          flex: 1,
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          fontSize: 11,
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-mono)',
                          marginBottom: 3,
                        }}>
                          {chapters?.[hl.chapterIndex]?.title || `Ch ${hl.chapterIndex + 1}`}
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          lineHeight: 1.4,
                          fontFamily: 'var(--font-body)',
                          fontStyle: 'italic',
                        }}>
                          "{hl.text.length > 120 ? hl.text.slice(0, 120) + '...' : hl.text}"
                        </div>
                        {hl.note && (
                          <div style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            marginTop: 4,
                          }}>
                            {hl.note}
                          </div>
                        )}
                        <div style={{
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          marginTop: 3,
                        }}>
                          {new Date(hl.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => onDeleteHighlight(hl.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: 14,
                          cursor: 'pointer',
                          padding: '2px 4px',
                          flexShrink: 0,
                        }}
                        title="Remove highlight"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
            )
          )}
        </div>
      </div>
    </>
  );
}
