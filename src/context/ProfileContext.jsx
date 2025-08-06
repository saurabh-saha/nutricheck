import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../utils/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const IntakeContext = createContext();

export function IntakeProvider({ children }) {
  const [recommendedIntake, setRecommendedIntake] = useState(null);

  // Load from Firestore or localStorage
  useEffect(() => {
    async function loadIntake() {
      if (auth.currentUser) {
        // Try Firestore
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists() && snap.data().recommendedIntake) {
          setRecommendedIntake(snap.data().recommendedIntake);
          localStorage.setItem("recommendedIntake", JSON.stringify(snap.data().recommendedIntake));
          return;
        }
      }
      // Fallback to localStorage
      const saved = localStorage.getItem("recommendedIntake");
      if (saved) {
        setRecommendedIntake(JSON.parse(saved));
      }
    }
    loadIntake();
  }, []);

  // Save whenever recommendedIntake changes
  useEffect(() => {
    if (!recommendedIntake) return;

    // Always save to localStorage
    localStorage.setItem("recommendedIntake", JSON.stringify(recommendedIntake));

    // If logged in, also save to Firestore
    if (auth.currentUser) {
      setDoc(
        doc(db, "users", auth.currentUser.uid),
        { recommendedIntake },
        { merge: true }
      );
    }
  }, [recommendedIntake]);

  return (
    <IntakeContext.Provider value={{ recommendedIntake, setRecommendedIntake }}>
      {children}
    </IntakeContext.Provider>
  );
}

export function useIntake() {
  return useContext(IntakeContext);
}
