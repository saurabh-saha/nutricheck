import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  getTrackerHistory,
  getTodayDate
} from '../utils/nutritionTracker.js'
import { computeSummary } from '../utils/nutritionTracker';
import AddFoodDialog from '../components/AddFoodDialog'
import NutrientBreakdown from "../components/NutrientBreakdown"

export default function NutritionTracker() {
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

    </Layout>
  )
}
