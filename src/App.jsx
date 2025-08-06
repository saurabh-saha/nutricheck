import { Routes, Route } from "react-router-dom";
import { IntakeProvider } from "./context/ProfileContext";
import NutritionTracker from "./pages/NutritionTracker";
import Profile from "./pages/Profile";
import CalorieFinder from "./pages/CalorieFinder";

export default function App() {
  return (
    <IntakeProvider>
      <Routes>
        <Route path="/" element={<CalorieFinder />} />
        <Route path="/track" element={<NutritionTracker />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </IntakeProvider>
  );
}
