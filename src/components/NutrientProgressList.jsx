import { nutrientMap } from "../utils/nutritionTracker"

const formatValue = (value) => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value;
};

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
            <div className="flex items-center justify-between font-medium mb-1">
              {/* Full name shows, only truncates if overflow */}
              <span className="flex-1 pr-2 overflow-hidden truncate whitespace-nowrap">
                {label}
              </span>

              {/* Fixed width value for alignment */}
              <span className="w-24 text-right">
                {formatValue(current)} / {formatValue(goal)} {unit}
              </span>
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
