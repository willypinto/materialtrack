import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdYADVgP7uC9iFj4V7XnuQuwFodJgIJyQ",
  authDomain: "materialtrack-4bbbe.firebaseapp.com",
  projectId: "materialtrack-4bbbe",
  storageBucket: "materialtrack-4bbbe.firebasestorage.app",
  messagingSenderId: "576623127294",
  appId: "1:576623127294:web:0bbe491f6245ee8db713af"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
