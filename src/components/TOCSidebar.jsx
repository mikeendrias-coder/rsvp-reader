import React from 'react';

export default function TOCSidebar({ book, chapterIndex, onSelectChapter, open, onClose }) {
  if (!open || !book) return null;

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
        left: 0,
        bottom: 0,
        width: 300,
        background: 'var(--bg-primary)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}>
            Contents
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--text-muted)',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            {book.title}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 2,
          }}>
            {book.author}
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}>
          {book.chapters.map((ch, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectChapter(i);
                onClose();
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 20px',
                background: i === chapterIndex ? 'var(--accent-soft)' : 'transparent',
                border: 'none',
                borderLeft: i === chapterIndex ? '3px solid var(--accent)' : '3px solid transparent',
                fontSize: 13,
                color: i === chapterIndex ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: i === chapterIndex ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {ch.title}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
