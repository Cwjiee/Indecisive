import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple env file parser without extra dependencies
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim();
      }
    }
    return envVars;
  } catch (e) {
    console.warn('Could not load .env file:', e);
    return {};
  }
}

const env = loadEnv();

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
};

if (!firebaseConfig.projectId) {
  console.error('Error: VITE_FIREBASE_PROJECT_ID not set in .env');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearRooms() {
  console.log('Fetching rooms from Firestore...');
  try {
    const roomsRef = collection(db, 'rooms');
    const snapshot = await getDocs(roomsRef);

    if (snapshot.empty) {
      console.log('No rooms found to clear.');
      process.exit(0);
    }

    console.log(`Found ${snapshot.size} room(s). Deleting...`);
    const deletePromises = snapshot.docs.map((docSnap) => {
      console.log(`Deleting room: ${docSnap.id}`);
      return deleteDoc(doc(db, 'rooms', docSnap.id));
    });

    await Promise.all(deletePromises);
    console.log('Successfully cleared all rooms from Firestore!');
  } catch (error) {
    console.error('Error clearing rooms:', error);
  } finally {
    process.exit(0);
  }
}

clearRooms();
