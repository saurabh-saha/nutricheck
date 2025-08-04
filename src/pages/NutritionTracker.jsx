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
          <div
            key={key}
            onClick={() => setSelectedNutrient(key === selectedNutrient ? null : key)}
            className={`flex justify-between border p-2 rounded cursor-pointer transition ${
              selectedNutrient === key ? 'bg-blue-100 dark:bg-blue-900 scale-105' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
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
      {selectedNutrient && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">
              Breakdown for:{" "}
              {nutrientMap.find(n => n.key === selectedNutrient)?.label || selectedNutrient}
            </h4>
            <button
              onClick={() => setSelectedNutrient("calories")}
              className="text-xs text-blue-500 underline"
            >
              Reset Filter
            </button>
          </div>

          {(() => {
            const filtered = history
              .filter(e => e.date === getTodayDate() && e.nutrition[selectedNutrient] > 0)
            const total = todayData[selectedNutrient] || 0

            return filtered.map((entry, index) => {
              const value = entry.nutrition[selectedNutrient]
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0
              return (
                <div
                  key={index}
                  className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1 animate-fade-in"
                >
                  <span>🍽️ {entry.dish}</span>
                  <span>{value}g ({percent}%)</span>
                </div>
              )
            })
          })()}
        </div>
      )}



      {/* Add Entry Button + Dialog */}
      <AddFoodDialog
        setHistory={setHistory}
        setTodayData={setTodayData}
      />

    </Layout>
  )
}
