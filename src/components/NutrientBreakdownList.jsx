import { nutrientMap } from "../utils/nutritionTracker"

export default function NutrientBreakdownList({
  selectedNutrient,
  setSelectedNutrient,
  filtered,
  total,
  onSelectMeal
}) {
  if (!selectedNutrient || filtered.length === 0) return null;

  const nutrientLabel =
    nutrientMap.find((n) => n.key === selectedNutrient)?.unit ||
    selectedNutrient;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4 shadow-sm">
      {/* Entries */}
      {filtered.map((entry, index) => {
        const value = entry.nutrition[selectedNutrient];
        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        return (
          <button
            key={index}
            onClick={() => onSelectMeal?.(entry)}
            className="w-full flex justify-between items-center px-3 py-2 mb-2
                       bg-white dark:bg-gray-700 rounded-lg shadow-sm
                       hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600
                       transition-all duration-200 text-left"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="text-lg">🍽️</span>
              <span className="truncate font-medium">{entry.dish}</span>
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {value}
              {nutrientLabel}{" "}
              <span className="text-gray-500 dark:text-gray-400">
                ({percent}%)
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

