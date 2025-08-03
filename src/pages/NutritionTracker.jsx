import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import DishInput from '../components/DishInput'
import {
  getTrackerHistory,
  getTodayDate
} from '../utils/nutritionTracker.js'
import { NutritionBarChart} from '../components/NutritionTrendChart'
import { nutrientMap, computeSummary, getLast7DaysSummary, recommendedIntake, handleAddEntry } from '../utils/nutritionTracker';
import AddFoodDialog from '../components/AddFoodDialog'


export default function NutritionTracker() {
  const [showInput, setShowInput] = useState(false)
  const [dish, setDish] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('bowl')
  const [isLoading, setIsLoading] = useState(false)
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

      {/* Add Entry Button + Dialog */}
      <AddFoodDialog
        setHistory={setHistory}
        setTodayData={setTodayData}
      />

    </Layout>
  )
}
