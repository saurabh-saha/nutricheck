import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import DishInput from '../components/DishInput'
import { getNutritionFromGemini } from '../utils/gemini.jsx'
import {
  getTrackerHistory,
  saveToTracker,
  getTodayDate
} from '../utils/nutritionTracker.js'
import { NutritionStackedChart} from '../components/NutritionTrendChart'
import { nutrientMap } from '../utils/nutritionTracker';

const recommendedIntake = {
  calories: 2200,
  protein: 50,
  fat: 70,
  carbs: 300,
  vitamins: 100,
  minerals: 100
}

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

  const computeSummary = (entries) => {
    const sum = {
      calories: 0, protein: 0, fat: 0, carbs: 0,
      vitamins: 0, minerals: 0
    }
  
    entries.forEach(e => {
      for (let key in sum) {
        let value = e.nutrition[key]
  
        if (typeof value === 'string') {
          // Strip non-numeric characters (like "g", "%", etc.)
          value = parseFloat(value.replace(/[^\d.-]/g, ''))
        }
  
        if (!isNaN(value)) {
          sum[key] += value
        }
      }
    })
  
    return sum
  }
  

  const handleAdd = async () => {
    if (!dish.trim()) return
    setIsLoading(true)

    const nutrition = await getNutritionFromGemini(dish, quantity, unit)
    setIsLoading(false)

    if (nutrition) {
      const fullDish = `${quantity} ${unit} of ${dish}`
      const newEntry = { date: getTodayDate(), dish: fullDish, nutrition }
      const updated = saveToTracker(newEntry)
      setHistory(updated)

      const today = updated.filter(e => e.date === getTodayDate())
      setTodayData(computeSummary(today))

      setDish('')
      setShowInput(false)
    } else {
      alert('Error fetching nutrition')
    }
  }

  const getLast7Days = () => {
    const days = {}
    history.forEach(e => {
      if (!days[e.date]) days[e.date] = []
      days[e.date].push(e)
    })

    const result = []
    Object.entries(days).slice(-7).forEach(([date, entries]) => {
      result.push({ date, ...computeSummary(entries) })
    })

    return result
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-4">📈 Nutrition Tracker</h1>

      {/* Chart/Trend Table */}
      <h2 className="text-md font-semibold mb-2 text-black dark:text-white">7-Day Nutrition Breakdown</h2>
      <div className="mb-6">
        <NutritionStackedChart data={getLast7Days()} />
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

      {/* Add Button */}
      {!showInput && (
        <button
          onClick={() => setShowInput(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow"
        >
          ➕ Add for Today
        </button>
      )}

      {showInput && (
        <div className="mt-4">
          <DishInput
            dish={dish}
            setDish={setDish}
            quantity={quantity}
            setQuantity={setQuantity}
            unit={unit}
            setUnit={setUnit}
            handleGenerate={handleAdd}
            isLoading={isLoading}
          />
        </div>
      )}
    </Layout>
  )
}
