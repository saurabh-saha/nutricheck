import { useState } from "react"
import { nutrientMap, recommendedIntake, getTodayDate, getLast7DaysSummary } from "../utils/nutritionTracker"
import { NutritionBarChart } from "./NutritionTrendChart"

export default function NutrientBreakdown({ history, todayData, selectedNutrient, setSelectedNutrient }) {
  const filtered = history.filter(
    e => e.date === getTodayDate() && e.nutrition[selectedNutrient] > 0
  )
  const total = todayData[selectedNutrient] || 0

  return (
    <div>
      {/* Chart Section */}
      <h2 className="text-md font-semibold mb-2 text-black dark:text-white">
        7-Day Nutrition Breakdown
      </h2>
      <div className="mb-6">
      <NutritionBarChart
        data={getLast7DaysSummary(history)}
        selectedKey={selectedNutrient}
        onChange={setSelectedNutrient}
      />
      </div>

      {/* Recommended vs Today */}
      <h2 className="text-md font-semibold mb-2">Today vs Recommended</h2>
      <div className="grid grid-cols-2 text-sm gap-2 mb-4">
        {nutrientMap.map(({ key, label, unit }) => (
          <div
            key={key}
            onClick={() =>
              setSelectedNutrient(key === selectedNutrient ? null : key)
            }
            className={`flex justify-between border p-2 rounded cursor-pointer transition ${
              selectedNutrient === key
                ? "bg-blue-100 dark:bg-blue-900 scale-105"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
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

      {/* Selected Nutrient Breakdown */}
      {selectedNutrient && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">
              Breakdown for:{" "}
              {nutrientMap.find(n => n.key === selectedNutrient)?.label ||
                selectedNutrient}
            </h4>
            <button
              onClick={() => setSelectedNutrient("calories")}
              className="text-xs text-blue-500 underline"
            >
              Reset Filter
            </button>
          </div>

          {filtered.map((entry, index) => {
            const value = entry.nutrition[selectedNutrient]
            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return (
              <div
                key={index}
                className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1 animate-fade-in"
              >
                <span>🍽️ {entry.dish}</span>
                <span>
                  {value}
                  {selectedNutrient === "calories" ? " kcal" : "g"} ({percent}
                  %)
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
