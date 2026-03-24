import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAKJu58BaNV2l9Avq0AmCqU7QGPaSewhQU",
  authDomain: "civil-drawings-69f8e.firebaseapp.com",
  databaseURL: "https://civil-drawings-69f8e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "civil-drawings-69f8e",
  storageBucket: "civil-drawings-69f8e.firebasestorage.app",
  messagingSenderId: "650330953399",
  appId: "1:650330953399:web:34c26e8cc8eb866d195f32"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
