// src/context/ProfileContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState({
    age: "",
    sex: "male",
    height: "",
    weight: "",
    bmi: null,
    recommended: {
      calories: 2200,
      protein: 50,
      fat: 70,
      carbs: 300,
      vitamins: 100,
      minerals: 100
    }
  });

  // Load profile from localStorage when app starts
  useEffect(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
