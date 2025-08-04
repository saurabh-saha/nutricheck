import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  getTrackerHistory,
  getTodayDate
} from '../utils/nutritionTracker.js'
import { NutritionBarChart} from '../components/NutritionTrendChart'
import { nutrientMap, computeSummary, getLast7DaysSummary, recommendedIntake } from '../utils/nutritionTracker';
import AddFoodDialog from '../components/AddFoodDialog'


export default function NutritionTracker() {
  const [history, setHistory] = useState([])
  const [todayData, setTodayData] = useState({})

  useEffect(() => {
    const all = getTrackerHistory()
    setHistory(all)

    const today = all.filter(e => e.date === getTodayDate())
    const summary = computeSummary(today)
    setTodayData(summary)
  }, [])

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">📈 Nutrition Tracker</h1>

      {/* Chart/Trend Table */}
      <h2 className="text-md font-semibold mb-2 text-black dark:text-white">7-Day Nutrition Breakdown</h2>
      <div className="mb-6">
        <NutritionBarChart data={getLast7DaysSummary(history)} />
      </div>

      {/* Recommended vs Today */}
      <h2 className="text-md font-semibold mb-2">Today vs Recommended</h2>
      <div className="grid grid-cols-2 text-sm gap-2 mb-4">
        {nutrientMap.map(({ key, label, unit }) => (
          <div key={key} className="flex justify-between border p-2 rounded">
            <span className="capitalize">{label}</span>
            <span>
              {todayData[key] || 0} / {recommendedIntake[key]}
              {unit}
            </span>
          </div>
        ))}
      </div>
      
      <h3 className="font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">
        Today's Entries
      </h3>
      {history
        .filter(entry => entry.date === getTodayDate())
        .map((entry, index) => (
          <div
            key={index}
            className="text-sm text-gray-700 dark:text-gray-300 mb-1"
          >
            🍽️ {entry.dish}
          </div>
      ))}

      {/* Add Entry Button + Dialog */}
      <AddFoodDialog
        setHistory={setHistory}
        setTodayData={setTodayData}
      />

    </Layout>
  )
}
