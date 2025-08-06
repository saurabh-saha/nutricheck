import { Routes, Route } from "react-router-dom";
import { IntakeProvider } from "./context/ProfileContext";
import NutritionTracker from "./pages/NutritionTracker";
import Profile from "./pages/Profile";
import CalorieFinder from "./pages/CalorieFinder";
import WelcomeModal from "./components/WelcomeModal";
import { useState, useEffect } from "react";
import { registerWelcomeHandler } from "./utils/firebaseLogin";

export default function App() {
  const [welcome, setWelcome] = useState({ show: false, name: "" });

  // Register the handler once so loginWithGoogle can trigger the modal
  useEffect(() => {
    registerWelcomeHandler(setWelcome);
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
