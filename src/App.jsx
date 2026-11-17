import { Routes, Route, useLocation } from "react-router-dom";
import { IntakeProvider } from "./context/ProfileContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import NutritionTracker from "./pages/NutritionTracker";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings"
import CalorieFinder from "./pages/CalorieFinder";
import History from "./pages/History";
import WelcomeModal from "./components/WelcomeModal";
import { Toaster } from "./components/ui/toaster";
import { useState, useEffect } from "react";
import { registerWelcomeHandler } from "./utils/firebaseLogin";
import { trackVisit, trackPageView } from "./utils/track";

export default function App() {
  const [welcome, setWelcome] = useState({ show: false, name: "" });

  // Register the handler once so loginWithGoogle can trigger the modal
  useEffect(() => {
    registerWelcomeHandler(setWelcome);
    trackVisit();
  }, []);

  // One page_view per screen (the URL keeps any utm_* tags for attribution).
  const { pathname } = useLocation();
  useEffect(() => { trackPageView(pathname); }, [pathname]);

  return (
    <DarkModeProvider>
      <IntakeProvider>
        <Routes>
          <Route path="/" element={<CalorieFinder />} />
          <Route path="/track" element={<NutritionTracker />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

        <Toaster />

        {/* Celebration Popup */}
        <WelcomeModal
          name={welcome.name}
          show={welcome.show}
          onClose={() => setWelcome({ show: false, name: "" })}
        />
      </IntakeProvider>
    </DarkModeProvider>
  );
}
