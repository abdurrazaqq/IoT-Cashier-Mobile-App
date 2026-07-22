import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCuQDgPrLcTE9NhKjzMXhEnPhnq0fwYaaU",
  authDomain: "database-kasir-a46d8.firebaseapp.com",
  projectId: "database-kasir-a46d8",
  storageBucket: "database-kasir-a46d8.firebasestorage.app",
  messagingSenderId: "694407241213",
  appId: "1:694407241213:web:8c82f434808c6095570d94",
  measurementId: "G-FG1HGSLB23"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;