import { nutrientMap } from "../utils/nutritionTracker"
import { cleanDishLabel } from "../utils/units";

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
      {filtered
        .slice()
        .sort((a, b) => {
          const valueA = a.nutrition[selectedNutrient] || 0;
          const valueB = b.nutrition[selectedNutrient] || 0;
          const percentA = total > 0 ? valueA / total : 0;
          const percentB = total > 0 ? valueB / total : 0;
          return percentB - percentA; // descending
        })
        .map((entry, index) => {
          const value = entry.nutrition[selectedNutrient] || 0;
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
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-lg">🍽️</span>
                  <div className="font-medium break-words w-full">{cleanDishLabel(entry.dish)}</div>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                  {nutrientLabel}{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    ({percent}%)
                  </span>
                </span>
              </div>
            </button>
          );
        })}
    </div>
  );
}

