import React, { useState, useEffect, useRef } from 'react';
import { getLibrary, uploadBookToLibrary, downloadBookFromLibrary, deleteBookFromLibrary } from '../utils/firebase.js';
import { getSupportedExtensions } from '../parsers/index.js';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LibraryPanel({ user, onLoadBook, onClose, open }) {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const inputRef = useRef(null);

  // Load library on open
  useEffect(() => {
    if (open && user) {
      setLoading(true);
      getLibrary(user.uid).then(items => {
        setLibrary(items);
        setLoading(false);
      });
    }
  }, [open, user]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Hash the file
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

      await uploadBookToLibrary(user.uid, file, fileHash);

      // Refresh library
      const items = await getLibrary(user.uid);
      setLibrary(items);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleLoad = async (item) => {
    setDownloading(item.fileHash);
    try {
      const blob = await downloadBookFromLibrary(item.storagePath);
      const file = new File([blob], item.fileName, { type: blob.type });
      onLoadBook(file);
      onClose();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to load book: ' + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('Remove "' + item.fileName + '" from your library?')) return;
    setDeleting(item.fileHash);
    try {
      await deleteBookFromLibrary(user.uid, item.fileHash, item.storagePath);
      setLibrary(prev => prev.filter(i => i.fileHash !== item.fileHash));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(null);
    }
  };

  if (!open) return null;

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
        width: 360,
        background: 'var(--bg-primary)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
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
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}>
            My Library
          </span>
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

        {/* Upload button */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? 'Uploading...' : '+ Upload a book'}
            <input
              ref={inputRef}
              type="file"
              accept={getSupportedExtensions().join(',')}
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 6,
          }}>
            EPUB, PDF, or plain text. Stored in your account.
          </div>
        </div>

        {/* Book list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              Loading library...
            </div>
          ) : library.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              Your library is empty. Upload a book to get started.
            </div>
          ) : (
            library.map(item => (
              <div
                key={item.fileHash}
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Book icon */}
                <div style={{
                  width: 36,
                  height: 44,
                  background: 'var(--accent-soft)',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {(item.fileName?.split('.').pop() || '?').slice(0, 4)}
                </div>

                {/* Info */}
                <button
                  onClick={() => handleLoad(item)}
                  disabled={downloading === item.fileHash}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: 0,
                    cursor: downloading === item.fileHash ? 'wait' : 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                  }}>
                    {downloading === item.fileHash ? 'Loading...' : item.fileName}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}>
                    {formatSize(item.fileSize)} · {formatDate(item.uploadedAt)}
                  </div>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deleting === item.fileHash}
                  title="Remove from library"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    flexShrink: 0,
                    opacity: deleting === item.fileHash ? 0.3 : 0.5,
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
