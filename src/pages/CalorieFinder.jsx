import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import DishInput from '../components/DishInput'
import NutritionResult from '../components/NutritionResult'
import PreviousSearches from '../components/PreviousSearches'
import { saveToHistory, getNutritionHistory } from '../utils/nutritionHistory'

export default function CalorieFinder() {
  const [result, setResult] = useState(null)
  const [previousSearches, setPreviousSearches] = useState([])

  useEffect(() => {
    const entries = getNutritionHistory()
    setPreviousSearches(entries.map((e) => e.dish))
  }, [])

  const handleDishSelect = (dish, quantity, unit, nutrition) => {
    const fullDish = `${quantity} ${unit} of ${dish}`.trim();
    setResult(nutrition);
    const updated = saveToHistory(fullDish, nutrition);
    setPreviousSearches(updated);
  }

  return (
      <Layout>
        <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🍽️ <span>Calorie Finder</span>
        </h1>

        <DishInput onSelect={handleDishSelect} />

        <NutritionResult result={result} />

        <PreviousSearches
          searches={previousSearches}
          onClick={(dishName) => {
            // Load saved result from history without calling Gemini
            const entries = getNutritionHistory();
            const found = entries.find(e => e.dish === dishName);
            if (found) setResult(found.nutrition);
          }}
        />
      </Layout>
  )
}
