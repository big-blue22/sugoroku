// Mock Firebase for local verification
import { initializeApp } from 'firebase/app';
// We still import these but we will mock the objects if needed, or rely on dummy config
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "dummy-api-key",
  authDomain: "dummy-auth-domain",
  projectId: "dummy-project-id",
  storageBucket: "dummy-storage-bucket",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef",
  databaseURL: "https://dummy-project-id-default-rtdb.firebaseio.com"
};

export const checkFirebaseConfig = (): string[] => {
  return []; // Always pass check
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
