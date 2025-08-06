import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvIojeDea1X5KkX0ulx6K6mEXIYSXaNH4",
  authDomain: "nutricheck-f7e71.firebaseapp.com",
  projectId: "nutricheck-f7e71",
  storageBucket: "nutricheck-f7e71.firebasestorage.app",
  messagingSenderId: "815125660966",
  appId: "1:815125660966:web:becfc7911156801e972de7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
