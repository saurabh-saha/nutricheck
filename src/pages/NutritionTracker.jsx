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

export default function NutritionTracker() {
  const [user, authLoading] = useAuthState(auth);

  const [history, setHistory] = useState([])
  const [todayData, setTodayData] = useState({})
  const [selectedNutrient, setSelectedNutrient] = useState("calories")

  useEffect(() => {
    // Works for guests (device storage) and logged-in users (Firestore).
    // On login, guest entries are moved into the account.
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const hadGuestEntries = Boolean(u) && hasGuestEntries();
      await refreshTrackerState({ setHistory, setTodayData });
      if (hadGuestEntries && !hasGuestEntries()) {
        toast({ title: "✅ Saved to your account", description: "Entries from this device are now backed up." });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <Layout>
      {!authLoading && !user && <GuestBanner className="mb-4" />}

      <div className="bg-gray-900 p-4 rounded-lg">
        <NutrientBreakdown
          history={history}
          todayData={todayData}
          selectedNutrient={selectedNutrient}
          setSelectedNutrient={setSelectedNutrient}
        />

        <AddFoodDialog
          history={history}
          setHistory={setHistory}
          setTodayData={setTodayData}
        />
      </div>
    </Layout>
  )
}
