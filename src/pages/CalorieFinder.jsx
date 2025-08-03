import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import DishInput from '../components/DishInput'
import NutritionResult from '../components/NutritionResult'
import PreviousSearches from '../components/PreviousSearches'
import { getNutritionFromGemini } from '../utils/gemini.jsx'
import {
  saveToHistory,
  getNutritionHistory,
  getNutritionForDish
} from '../utils/nutritionHistory'

export default function CalorieFinder() {
  const [dish, setDish] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previousSearches, setPreviousSearches] = useState([])

  useEffect(() => {
    const entries = getNutritionHistory()
    setPreviousSearches(entries.map((e) => e.dish))
  }, [])

  const handleGenerate = async () => {
    if (!dish.trim()) return

    setIsLoading(true)
    const nutrition = await getNutritionFromGemini(dish)
    setIsLoading(false)

    if (nutrition) {
      setResult(nutrition)
      const updated = saveToHistory(dish, nutrition)
      setPreviousSearches(updated)
    } else {
      alert('Error getting nutrition data')
    }
  }

  const handleGenerateFromClick = (dishName) => {
    setDish(dishName)
    const nutrition = getNutritionForDish(dishName)
    if (nutrition) setResult(nutrition)
  }

  return (
    <Layout>
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🍽️ <span>Calorie Finder</span>
      </h1>

      <DishInput
        dish={dish}
        setDish={setDish}
        handleGenerate={handleGenerate}
        isLoading={isLoading}
      />

      <NutritionResult result={result} />

      <PreviousSearches
        searches={previousSearches}
        onClick={handleGenerateFromClick}
      />

      <Link
        to="/track"
        className="mt-6 inline-block text-sm text-blue-500 underline"
      >
        ➡️ Go to Nutrition Tracker
      </Link>
    </Layout>
  )
}
