import { useState, useEffect } from 'react'
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import Layout from '../components/Layout'
import { refreshTrackerState, hasGuestEntries } from '../utils/nutritionTracker.js'
import { toast } from "../hooks/use-toast"
import GuestBanner from "../components/GuestBanner"
import AddFoodDialog from '../components/AddFoodDialog'
import NutrientBreakdown from "../components/NutrientBreakdown"
import CalorieRing from "../components/CalorieRing"
import Onboarding, { ONBOARDING_DONE_KEY } from "../components/Onboarding"
import { useIntake } from "../context/ProfileContext"
import { loadProfileFromFirestore } from "../utils/firebaseLogin"
import { getDefaultIntake } from "../utils/nutritionTracker.js"

// First visit with no profile anywhere -> show onboarding.
async function needsOnboarding(user) {
  if (localStorage.getItem(ONBOARDING_DONE_KEY) || localStorage.getItem("userProfile")) return false;
  if (user) {
    const data = await loadProfileFromFirestore().catch(() => null);
    if (data?.profile) {
      localStorage.setItem("userProfile", JSON.stringify(data.profile));
      return false;
    }
  }
  return true;
}

export default function NutritionTracker() {
  const [user, authLoading] = useAuthState(auth);

  const [history, setHistory] = useState([])
  const [todayData, setTodayData] = useState({})
  const [selectedNutrient, setSelectedNutrient] = useState("calories")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const { recommendedIntake } = useIntake()
  const intake = recommendedIntake || getDefaultIntake()

  useEffect(() => {
    // Works for guests (device storage) and logged-in users (Firestore).
    // On login, guest entries are moved into the account.
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const hadGuestEntries = Boolean(u) && hasGuestEntries();
      await refreshTrackerState({ setHistory, setTodayData });
      setShowOnboarding(await needsOnboarding(u));
      if (hadGuestEntries && !hasGuestEntries()) {
        toast({ title: "✅ Saved to your account", description: "Entries from this device are now backed up." });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <Layout>
      {!authLoading && !user && <GuestBanner className="mb-4" />}

      <div className="bg-gray-900 text-white p-4 rounded-lg mb-4">
        <CalorieRing
          eaten={todayData.calories || 0}
          target={intake.calories}
          protein={todayData.protein || 0}
          proteinTarget={intake.protein}
        />
      </div>

      <div className="bg-gray-900 p-4 rounded-lg">
        <NutrientBreakdown
          history={history}
          todayData={todayData}
          selectedNutrient={selectedNutrient}
          setSelectedNutrient={setSelectedNutrient}
        />

        <AddFoodDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          history={history}
          setHistory={setHistory}
          setTodayData={setTodayData}
        />
      </div>
      {showOnboarding && (
        <Onboarding
          onDone={() => setShowOnboarding(false)}
          onLogFirstMeal={() => setAddOpen(true)}
        />
      )}
    </Layout>
  )
}
