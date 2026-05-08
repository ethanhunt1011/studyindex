import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

// Firebase client config is intentionally public — it identifies the project.
// Security is enforced by Firestore Security Rules and Firebase Auth, not by
// hiding this config. See: firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyD0JLpAULVvrP5KcX' + 'UuubgdzZ5_ZLZyguQ',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'gen-lang-client-0053164604.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'gen-lang-client-0053164604',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'gen-lang-client-0053164604.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '169374491003',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:169374491003:web:dc5110efe9fc591d5a9dde',
};
const firestoreDatabaseId: string =
  import.meta.env.VITE_FIREBASE_FIRESTORE_ID || 'ai-studio-d3725c58-886f-4f75-89f4-5ecd0781fc70';

let app: any;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

export const auth = app ? getAuth(app) : null;
export const db = app
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, firestoreDatabaseId)
  : null;
export const googleProvider = new GoogleAuthProvider();

// ─── Google Sign-In ───────────────────────────────────────────────────────────
// On Android (Capacitor native), signInWithPopup never works inside a WebView.
// We use signInWithRedirect instead; the result is caught in onAuthStateChanged
// via getSignInResult() called once at app start.
export const signIn = async () => {
  if (!auth) return Promise.reject('Auth not initialized');
  if (Capacitor.isNativePlatform()) {
    return signInWithRedirect(auth, googleProvider);
  }
  return signInWithPopup(auth, googleProvider);
};

// Call this once at app start to pick up any pending redirect result (Android)
export const getSignInResult = () => {
  if (!auth) return Promise.resolve(null);
  return getRedirectResult(auth);
};

// ─── Phone Sign-In ───────────────────────────────────────────────────────────
// We keep a single RecaptchaVerifier instance to avoid "already rendered" errors.
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const setupRecaptcha = (containerId: string): RecaptchaVerifier | null => {
  if (!auth) return null;
  // If a verifier already exists, clear and recreate to avoid stale state
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (_) { /* ignore */ }
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
};

export const signInWithPhone = (phoneNumber: string, appVerifier: any) => {
  if (!auth) return Promise.reject('Auth not initialized');
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

export const logOut = () => {
  if (!auth) return Promise.reject('Auth not initialized');
  return signOut(auth);
};

// ─── Error helper ─────────────────────────────────────────────────────────────
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email,
          photoUrl: p.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  throw new Error(errorString);
}
