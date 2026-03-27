const STORAGE_KEY = 'rsvp-reader-data';

function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

// --- Book state (reading position, preferences) ---

export function saveBookState(fileHash, state) {
  const store = getStore();
  store[fileHash] = {
    ...store[fileHash],
    ...state,
    updatedAt: Date.now(),
  };
  saveStore(store);
}

export function loadBookState(fileHash) {
  const store = getStore();
  return store[fileHash] || null;
}

// --- Global preferences ---

export function saveGlobalPrefs(prefs) {
  const store = getStore();
  store.__prefs = { ...store.__prefs, ...prefs };
  saveStore(store);
}

export function loadGlobalPrefs() {
  const store = getStore();
  return store.__prefs || {
    theme: 'light',
    fontSize: 16,
    fontFamily: 'Literata',
    wpm: 300,
  };
}

// --- Bookmarks ---
// Stored per book as an array: [{ id, chapterIndex, wordIndex, label, createdAt }]

export function loadBookmarks(fileHash) {
  const store = getStore();
  return store[fileHash]?.bookmarks || [];
}

export function saveBookmarks(fileHash, bookmarks) {
  const store = getStore();
  if (!store[fileHash]) store[fileHash] = {};
  store[fileHash].bookmarks = bookmarks;
  store[fileHash].updatedAt = Date.now();
  saveStore(store);
}

// --- Highlights ---
// Stored per book as an array:
// [{ id, chapterIndex, startWordIndex, endWordIndex, text, color, note, createdAt }]

export function loadHighlights(fileHash) {
  const store = getStore();
  return store[fileHash]?.highlights || [];
}

export function saveHighlights(fileHash, highlights) {
  const store = getStore();
  if (!store[fileHash]) store[fileHash] = {};
  store[fileHash].highlights = highlights;
  store[fileHash].updatedAt = Date.now();
  saveStore(store);
}
