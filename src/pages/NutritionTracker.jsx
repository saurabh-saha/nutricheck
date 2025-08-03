import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function NutritionTracker() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('nutritionHistory')
    return saved ? JSON.parse(saved) : []
  })

  const clearHistory = () => {
    localStorage.removeItem('nutritionHistory')
    setHistory([])
  }

  return (
    <Layout>
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">📊 Nutrition Tracker</h1>

        {history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No history yet. Try analyzing a dish first!
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div
                key={i}
                className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded"
              >
                <h3 className="font-semibold">{entry.dish}</h3>
                {Object.entries(entry.nutrition).map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}:</strong> {value}
                  </p>
                ))}
              </div>
            ))}

            <button
              onClick={clearHistory}
              className="text-sm text-red-500 underline mt-2 hover:text-red-700 dark:hover:text-red-400"
            >
              🗑️ Clear History
            </button>
          </div>
        )}

        <Link
          to="/"
          className="mt-6 inline-block text-sm text-blue-500 dark:text-blue-400 underline"
        >
          ⬅️ Back to Calorie Finder
        </Link>
      </div>
    </Layout>
  )
}
