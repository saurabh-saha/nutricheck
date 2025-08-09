import { nutrientMap } from "../utils/nutritionTracker"

export default function NutrientBreakdownList({ selectedNutrient, setSelectedNutrient, filtered, total }) {
  if (!selectedNutrient) return null;

  const nutrientLabel = nutrientMap.find(n => n.key === selectedNutrient)?.label || selectedNutrient;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100">
          Breakdown for: {nutrientLabel}
        </h4>
        <button
          onClick={() => setSelectedNutrient("calories")}
          className="text-xs text-blue-500 underline"
        >
          Reset Filter
        </button>
      </div>

      {/* Entries */}
      {filtered.map((entry, index) => {
        const value = entry[selectedNutrient];
        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        return (
          <div
            key={index}
            className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1 animate-fade-in"
          >
            <span>🍽️ {entry.dish}</span>
            <span>
              {value}
              {selectedNutrient === "calories" ? " kcal" : "g"} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
