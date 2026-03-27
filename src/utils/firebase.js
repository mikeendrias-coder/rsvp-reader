import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes, deleteObject, listAll } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAtzKEbaIqmJw5PLRPLWnQGai_dCD6tZQU",
  authDomain: "rsvp-reader-dafa2.firebaseapp.com",
  projectId: "rsvp-reader-dafa2",
  storageBucket: "rsvp-reader-dafa2.firebasestorage.app",
  messagingSenderId: "1008879451671",
  appId: "1:1008879451671:web:6fc1cc06b0398ebbbe6652"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth ---

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (e) {
    console.error('Sign in error:', e);
    throw e;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// --- Firestore sync ---

function bookDocRef(uid, fileHash) {
  return doc(db, 'users', uid, 'books', fileHash);
}

function prefsDocRef(uid) {
  return doc(db, 'users', uid, 'prefs', 'global');
}

export async function syncBookToCloud(uid, fileHash, data) {
  if (!uid || !fileHash) return;
  try {
    await setDoc(bookDocRef(uid, fileHash), {
      ...data,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (e) {
    console.warn('Cloud sync write error:', e);
  }
}

export async function loadBookFromCloud(uid, fileHash) {
  if (!uid || !fileHash) return null;
  try {
    const snap = await getDoc(bookDocRef(uid, fileHash));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Cloud sync read error:', e);
    return null;
  }
}

export async function syncPrefsToCloud(uid, prefs) {
  if (!uid) return;
  try {
    await setDoc(prefsDocRef(uid), { ...prefs, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn('Cloud prefs write error:', e);
  }
}

export async function loadPrefsFromCloud(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(prefsDocRef(uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Cloud prefs read error:', e);
    return null;
  }
}

export function onBookChange(uid, fileHash, callback) {
  if (!uid || !fileHash) return () => {};
  return onSnapshot(bookDocRef(uid, fileHash), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

// --- Firebase Storage (book file library) ---
// Files stored at: users/{uid}/library/{fileHash}/{filename}
// Metadata stored in Firestore: users/{uid}/library/{fileHash}

function libraryDocRef(uid, fileHash) {
  return doc(db, 'users', uid, 'library', fileHash);
}

function libraryCollectionRef(uid) {
  return collection(db, 'users', uid, 'library');
}

export async function uploadBookToLibrary(uid, file, fileHash) {
  if (!uid) throw new Error('Must be signed in to upload');

  // Upload file to Storage
  const storageRef = ref(storage, `users/${uid}/library/${fileHash}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  await setDoc(libraryDocRef(uid, fileHash), {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || file.name.split('.').pop(),
    fileHash,
    downloadURL,
    storagePath: `users/${uid}/library/${fileHash}/${file.name}`,
    uploadedAt: Date.now(),
  });

  return { downloadURL, fileHash };
}

export async function getLibrary(uid) {
  if (!uid) return [];
  try {
    const snap = await getDocs(libraryCollectionRef(uid));
    const items = [];
    snap.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
  } catch (e) {
    console.warn('Library load error:', e);
    return [];
  }
}

export async function downloadBookFromLibrary(storagePath) {
  const storageRef = ref(storage, storagePath);
  const bytes = await getBytes(storageRef);
  return new Blob([bytes]);
}

export async function deleteBookFromLibrary(uid, fileHash, storagePath) {
  if (!uid) return;
  try {
    // Delete from Storage
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef).catch(() => {});
    }
    // Delete metadata from Firestore
    await deleteDoc(libraryDocRef(uid, fileHash));
  } catch (e) {
    console.warn('Library delete error:', e);
  }
}
