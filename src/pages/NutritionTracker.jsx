import { useState, useEffect } from 'react'
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebaseConfig";
import { loginWithGoogle } from "../utils/firebaseLogin";

import Layout from '../components/Layout'
import {
  getTrackerHistory,
  getTodayDate
} from '../utils/nutritionTracker.js'
import { computeSummary } from '../utils/nutritionTracker';
import AddFoodDialog from '../components/AddFoodDialog'
import NutrientBreakdown from "../components/NutrientBreakdown"

export default function NutritionTracker() {
  const [user] = useAuthState(auth);
  const [history, setHistory] = useState([])
  const [todayData, setTodayData] = useState({})
  const [selectedNutrient, setSelectedNutrient] = useState("calories")

  useEffect(() => {
    const all = getTrackerHistory()
    setHistory(all)

    const today = all.filter(e => e.date === getTodayDate())
    const summary = computeSummary(today)
    setTodayData(summary)
  }, [])

  return (
    <Layout>
      <div className={`relative ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
        <NutrientBreakdown
          history={history}
          todayData={todayData}
          selectedNutrient={selectedNutrient}
          setSelectedNutrient={setSelectedNutrient}
        />

        <AddFoodDialog
          setHistory={setHistory}
          setTodayData={setTodayData}
        />
      </div>

      {!user && (
        <div className="fixed inset-0 flex flex-col justify-center items-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Login Required
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Login to track your diet and reach your goals. This is a paid feature.
            </p>
            <button
              onClick={() => loginWithGoogle()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Login with Google
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
