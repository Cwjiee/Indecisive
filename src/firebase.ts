import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration loaded dynamically from environment variables (.env)
// Prefixed with VITE_ to be exposed to client-side code by Vite
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
export default app;
