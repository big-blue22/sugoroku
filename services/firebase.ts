import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Simple validation to ensure required keys are present
export const checkFirebaseConfig = (): string[] => {
  const missingKeys: string[] = [];
  if (!firebaseConfig.apiKey) missingKeys.push("VITE_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain) missingKeys.push("VITE_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId) missingKeys.push("VITE_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.storageBucket) missingKeys.push("VITE_FIREBASE_STORAGE_BUCKET");
  if (!firebaseConfig.messagingSenderId) missingKeys.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
  if (!firebaseConfig.appId) missingKeys.push("VITE_FIREBASE_APP_ID");
  return missingKeys;
};

// Initialize Firebase only if config is valid (or let it fail, but we will check `checkFirebaseConfig` in the UI)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
