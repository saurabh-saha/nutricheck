import { Routes, Route } from "react-router-dom";
import { IntakeProvider } from "./context/ProfileContext";
import NutritionTracker from "./pages/NutritionTracker";
import Profile from "./pages/Profile";
import CalorieFinder from "./pages/CalorieFinder";
import WelcomeModal from "./components/WelcomeModal";
import { useState, useEffect } from "react";
import { registerWelcomeHandler, initAuthRedirectHandler } from "./utils/firebaseLogin";

export default function App() {
  const [welcome, setWelcome] = useState({ show: false, name: "" });

  useEffect(() => {
    registerWelcomeHandler((data) => {
      setWelcome(data);
    });
    initAuthRedirectHandler();
  }, []);
  
  return (
    <IntakeProvider>
      <Routes>
        <Route path="/" element={<CalorieFinder />} />
        <Route path="/track" element={<NutritionTracker />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>

      {/* Celebration Popup */}
      <WelcomeModal
        name={welcome.name}
        show={welcome.show}
        onClose={() => setWelcome({ show: false, name: "" })}
      />
    </IntakeProvider>
  );
}
