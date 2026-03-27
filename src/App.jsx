import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { parseFile } from './parsers/index.js';
import {
  saveBookState, loadBookState, saveGlobalPrefs, loadGlobalPrefs,
  loadBookmarks, saveBookmarks, loadHighlights, saveHighlights,
} from './utils/storage.js';
import {
  onAuthChange, signInWithGoogle, signOutUser, getCurrentUser,
  syncBookToCloud, loadBookFromCloud, syncPrefsToCloud, loadPrefsFromCloud,
} from './utils/firebase.js';
import RSVPPanel from './components/RSVPPanel.jsx';
import ReaderView from './components/ReaderView.jsx';
import TOCSidebar from './components/TOCSidebar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import FileDropZone from './components/FileDropZone.jsx';
import AnnotationsPanel from './components/AnnotationsPanel.jsx';
import LibraryPanel from './components/LibraryPanel.jsx';

function buildChapterWords(chapter, chapterIndex) {
  const words = [];
  chapter.paragraphs.forEach((para, pi) => {
    para.split(/\s+/).filter(w => w).forEach((word, wi) => {
      words.push({
        text: word,
        chapterIndex,
        paragraphIndex: pi,
        wordInParagraph: wi,
        globalIndex: words.length,
      });
    });
  });
  return words;
}

export default function App() {
  const [prefs] = useState(() => loadGlobalPrefs());
  const [theme, setTheme] = useState(prefs.theme);
  const [fontSize, setFontSize] = useState(prefs.fontSize);
  const [fontFamily, setFontFamily] = useState(prefs.fontFamily);
  const [wpm, setWpm] = useState(prefs.wpm);

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Track if we should skip the next cloud sync (to avoid loops)
  const skipCloudSync = useRef(false);

  // Listen for auth changes
  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const chapterWords = useMemo(() => {
    if (!book || !book.chapters[chapterIndex]) return [];
    return buildChapterWords(book.chapters[chapterIndex], chapterIndex);
  }, [book, chapterIndex]);

  const currentChapter = book?.chapters[chapterIndex];
  const totalChapters = book?.chapters.length || 0;

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveGlobalPrefs({ theme, fontSize, fontFamily, wpm });
  }, [theme, fontSize, fontFamily, wpm]);

  // Persist reading position locally + cloud
  useEffect(() => {
    if (!book) return;
    const interval = setInterval(() => {
      const state = {
        chapterIndex, wordIndex,
        wpm, fontSize, fontFamily, theme,
        title: book.title, author: book.author,
      };
      saveBookState(book.fileHash, state);

      // Cloud sync
      if (user && !skipCloudSync.current) {
        syncBookToCloud(user.uid, book.fileHash, {
          position: { chapterIndex, wordIndex },
          prefs: { wpm, fontSize, fontFamily, theme },
          meta: { title: book.title, author: book.author },
          bookmarks,
          highlights,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [book, chapterIndex, wordIndex, wpm, fontSize, fontFamily, theme, user, bookmarks, highlights]);

  // Save on pause
  useEffect(() => {
    if (!playing && book) {
      const state = {
        chapterIndex, wordIndex,
        wpm, fontSize, fontFamily, theme,
        title: book.title, author: book.author,
      };
      saveBookState(book.fileHash, state);

      if (user) {
        syncBookToCloud(user.uid, book.fileHash, {
          position: { chapterIndex, wordIndex },
          prefs: { wpm, fontSize, fontFamily, theme },
          meta: { title: book.title, author: book.author },
          bookmarks,
          highlights,
        });
      }
    }
  }, [playing]);

  // Save bookmarks/highlights locally
  useEffect(() => {
    if (book) saveBookmarks(book.fileHash, bookmarks);
  }, [bookmarks, book]);

  useEffect(() => {
    if (book) saveHighlights(book.fileHash, highlights);
  }, [highlights, book]);

  // Chapter navigation
  const goToChapter = useCallback((idx) => {
    if (!book) return;
    const clamped = Math.max(0, Math.min(idx, book.chapters.length - 1));
    setPlaying(false);
    setChapterIndex(clamped);
    setWordIndex(0);
  }, [book]);

  const nextChapter = useCallback(() => goToChapter(chapterIndex + 1), [chapterIndex, goToChapter]);
  const prevChapter = useCallback(() => goToChapter(chapterIndex - 1), [chapterIndex, goToChapter]);

  const onChapterEnd = useCallback(() => {
    if (chapterIndex < totalChapters - 1) {
      setChapterIndex(ci => ci + 1);
      setWordIndex(0);
    } else {
      setPlaying(false);
    }
  }, [chapterIndex, totalChapters]);

  // Bookmarks
  const handleToggleBookmark = useCallback((chapIdx, paraIdx, wordIdx, label) => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.chapterIndex === chapIdx && b.paragraphIndex === paraIdx);
      if (existing) return prev.filter(b => b.id !== existing.id);
      return [...prev, {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        chapterIndex: chapIdx,
        paragraphIndex: paraIdx,
        wordIndex: wordIdx,
        label: label || 'Bookmark',
        createdAt: Date.now(),
      }];
    });
  }, []);

  const handleAddHighlight = useCallback((hl) => {
    setHighlights(prev => [...prev, {
      ...hl,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now(),
    }]);
  }, []);

  const handleDeleteBookmark = useCallback((id) => setBookmarks(prev => prev.filter(b => b.id !== id)), []);
  const handleDeleteHighlight = useCallback((id) => setHighlights(prev => prev.filter(h => h.id !== id)), []);

  const handleNavigateBookmark = useCallback((bm) => {
    setPlaying(false);
    setChapterIndex(bm.chapterIndex);
    setWordIndex(bm.wordIndex || 0);
    setAnnotationsOpen(false);
  }, []);

  const handleNavigateHighlight = useCallback((hl) => {
    setPlaying(false);
    setChapterIndex(hl.chapterIndex);
    setWordIndex(hl.startWordIndex);
    setAnnotationsOpen(false);
  }, []);

  // File loading
  const handleFileSelected = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setPlaying(false);

    try {
      const parsed = await parseFile(file);
      setBook(parsed);

      // Try cloud first, then local
      let savedState = null;
      if (user) {
        const cloudData = await loadBookFromCloud(user.uid, parsed.fileHash);
        if (cloudData) {
          savedState = {
            chapterIndex: cloudData.position?.chapterIndex,
            wordIndex: cloudData.position?.wordIndex,
            ...cloudData.prefs,
          };
          if (cloudData.bookmarks) setBookmarks(cloudData.bookmarks);
          if (cloudData.highlights) setHighlights(cloudData.highlights);
        }
      }

      if (!savedState) {
        savedState = loadBookState(parsed.fileHash);
        setBookmarks(loadBookmarks(parsed.fileHash));
        setHighlights(loadHighlights(parsed.fileHash));
      }

      if (savedState?.chapterIndex != null) {
        setChapterIndex(savedState.chapterIndex);
        setWordIndex(savedState.wordIndex || 0);
        if (savedState.wpm) setWpm(savedState.wpm);
        if (savedState.fontSize) setFontSize(savedState.fontSize);
        if (savedState.fontFamily) setFontFamily(savedState.fontFamily);
        if (savedState.theme) setTheme(savedState.theme);
      } else {
        setChapterIndex(0);
        setWordIndex(0);
        setBookmarks([]);
        setHighlights([]);
      }
    } catch (e) {
      console.error('Parse error:', e);
      setError('Failed to parse file: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auth handlers
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      setError('Sign in failed: ' + e.message);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const totalBookWords = useMemo(() => {
    if (!book) return 0;
    return book.chapters.reduce((sum, ch) => {
      return sum + ch.paragraphs.reduce((s, p) => s + p.split(/\s+/).filter(w => w).length, 0);
    }, 0);
  }, [book]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-secondary)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        minHeight: 44,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {book && (
            <button
              onClick={() => setTocOpen(true)}
              title="Table of Contents"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          )}
          {user && (
            <button
              onClick={() => setLibraryOpen(true)}
              title="My Library"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Library
            </button>
          )}
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--accent)',
            letterSpacing: '0.04em',
          }}>
            RSVP Reader
          </div>
          {book && (
            <div style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {book.title}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {book && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              Ch {chapterIndex + 1}/{totalChapters} · {totalBookWords.toLocaleString()} words
            </span>
          )}
          {book && (
            <button
              onClick={() => setAnnotationsOpen(true)}
              title="Bookmarks & Highlights"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                color: bookmarks.length + highlights.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ★ {bookmarks.length + highlights.length || ''}
            </button>
          )}
          {book && (
            <label
              title="Open a different file"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Open
              <input
                type="file"
                accept=".epub,.pdf,.txt,.text,.md"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileSelected(file);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ⚙
          </button>

          {/* Auth button */}
          {!authLoading && (
            user ? (
              <button
                onClick={handleSignOut}
                title={`Signed in as ${user.email}. Click to sign out.`}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <img
                  src={user.photoURL}
                  alt=""
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                  }}
                />
                <span style={{
                  fontSize: 10,
                  color: '#4caf50',
                  fontFamily: 'var(--font-mono)',
                }}>
                  synced
                </span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                title="Sign in with Google to sync across devices"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Sign in
              </button>
            )
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 16px',
          background: '#fee',
          color: '#c00',
          fontSize: 13,
          borderBottom: '1px solid #fcc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#c00', fontSize: 16, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {!book ? (
        <FileDropZone onFileSelected={handleFileSelected} loading={loading} user={user} onOpenLibrary={() => setLibraryOpen(true)} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <RSVPPanel
            words={chapterWords}
            currentIndex={wordIndex}
            setCurrentIndex={setWordIndex}
            playing={playing}
            setPlaying={setPlaying}
            wpm={wpm}
            setWpm={setWpm}
            chapterIndex={chapterIndex}
            totalChapters={totalChapters}
            chapterTitle={currentChapter?.title || ''}
            onNextChapter={nextChapter}
            onPrevChapter={prevChapter}
            onChapterEnd={onChapterEnd}
          />
          <div style={{ height: 2, background: 'var(--accent)', flexShrink: 0 }} />
          <ReaderView
            chapter={currentChapter}
            words={chapterWords}
            currentIndex={wordIndex}
            setCurrentIndex={setWordIndex}
            playing={playing}
            fontSize={fontSize}
            fontFamily={fontFamily}
            chapterIndex={chapterIndex}
            highlights={highlights}
            onAddHighlight={handleAddHighlight}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
          />
        </div>
      )}

      <TOCSidebar
        book={book}
        chapterIndex={chapterIndex}
        onSelectChapter={goToChapter}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
      />
      <AnnotationsPanel
        open={annotationsOpen}
        onClose={() => setAnnotationsOpen(false)}
        bookmarks={bookmarks}
        highlights={highlights}
        onDeleteBookmark={handleDeleteBookmark}
        onDeleteHighlight={handleDeleteHighlight}
        onNavigateBookmark={handleNavigateBookmark}
        onNavigateHighlight={handleNavigateHighlight}
        chapters={book?.chapters}
      />
      <LibraryPanel
        user={user}
        onLoadBook={handleFileSelected}
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );
}
