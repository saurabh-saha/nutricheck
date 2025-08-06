import { createContext, useContext, useState, useEffect } from "react";

const IntakeContext = createContext();

export function IntakeProvider({ children }) {
  const [recommendedIntake, setRecommendedIntake] = useState(null);

  // Load from localStorage on first render
  useEffect(() => {
    const saved = localStorage.getItem("recommendedIntake");
    if (saved) setRecommendedIntake(JSON.parse(saved));
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (recommendedIntake) {
      localStorage.setItem("recommendedIntake", JSON.stringify(recommendedIntake));
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
