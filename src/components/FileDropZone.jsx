import React, { useState, useRef } from 'react';
import { getSupportedExtensions } from '../parsers/index.js';

export default function FileDropZone({ onFileSelected, loading, user, onOpenLibrary }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const extensions = getSupportedExtensions();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        cursor: 'pointer',
        background: dragOver ? 'var(--accent-soft)' : 'var(--bg-primary)',
        border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
        margin: 24,
        transition: 'all 0.2s ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={extensions.join(',')}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) onFileSelected(file);
        }}
        style={{ display: 'none' }}
      />

      {loading ? (
        <>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}>
            Parsing book...
          </span>
        </>
      ) : (
        <>
          <div style={{
            fontSize: 48,
            lineHeight: 1,
            color: 'var(--text-muted)',
          }}>
            +
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            Drop a book here
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            EPUB, PDF, or plain text
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            style={{
              marginTop: 8,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Browse files
          </button>
          {user && onOpenLibrary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLibrary();
              }}
              style={{
                marginTop: 4,
                background: 'none',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Open from Library
            </button>
          )}
        </>
      )}
    </div>
  );
}
