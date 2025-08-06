import { nutrientMap } from "../utils/nutritionTracker"

export default function NutrientProgressList({ todayData, intake, selectedNutrient, setSelectedNutrient }) {
  return (
    <div className="grid grid-cols-2 text-sm gap-2 mb-4">
      {nutrientMap.map(({ key, label, unit, color }) => {
        const current = todayData[key] || 0;
        const goal = intake[key];
        const percent = Math.min((current / goal) * 100, 100);

        return (
          <div
            key={key}
            onClick={() =>
              setSelectedNutrient(key === selectedNutrient ? null : key)
            }
            className={`p-2 rounded cursor-pointer transition ${
              selectedNutrient === key
                ? "bg-blue-100 dark:bg-blue-900 scale-105"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {/* Label Row */}
            <div className="flex justify-between font-medium mb-1">
              <span>{label}</span>
              <span>{current} / {goal}{unit}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${percent}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  )
}
