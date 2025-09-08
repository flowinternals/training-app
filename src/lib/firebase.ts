import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyACGqQ4dXyLkmWaOBLyzIqsNOfu5wT6TB0",
  authDomain: "flowinternals-training-app.firebaseapp.com",
  projectId: "flowinternals-training-app",
  storageBucket: "flowinternals-training-app.firebasestorage.app",
  messagingSenderId: "730217047630",
  appId: "1:730217047630:web:bd1a87f6f1bd9217c1851f",
  measurementId: "G-NYZ9TCV5RQ"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
