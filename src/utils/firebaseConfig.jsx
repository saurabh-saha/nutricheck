import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAvIojeDea1X5KkX0ulx6K6mEXIYSXaNH4",
  authDomain: "nutricheck-f7e71.firebaseapp.com",
  projectId: "nutricheck-f7e71",
  storageBucket: "nutricheck-f7e71.firebasestorage.app",
  messagingSenderId: "815125660966",
  appId: "1:815125660966:web:becfc7911156801e972de7",
  measurementId: "G-5R931Z9N0W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (exported as a promise so we can wait for it)
export const analyticsPromise = (async () => {
  if (typeof window === "undefined") return null;

  const yes = await isSupported();
  if (!yes) return null;

  const analytics = getAnalytics(app);

  // 🚫 Disable automatic page_view
  if (window.gtag) {
    window.gtag("config", firebaseConfig.measurementId, {
      send_page_view: false,
    });
    console.log("[GA] Auto page_view disabled");
  }

  return analytics;
})();