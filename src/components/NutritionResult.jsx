import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { MEALS } from "../utils/nutritionTracker";

// Nutrition for the chosen dish, protein first (plus an "Added" note after logging it).
const MACROS = [
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
  { key: "fiber", label: "Fiber" },
];

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const mealLabel = (key) => MEALS.find((m) => m.key === key)?.label.toLowerCase() ?? "today";

export default function NutritionResult({ result, added = null }) {
  if (!result) return null
  const protein = num(result.protein);
  const calories = num(result.calories);
  // Share of calories from protein (4 kcal per gram).
  const proteinShare = calories > 0 ? Math.round((protein * 4 * 100) / calories) : 0;

  return (
    <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Protein</div>
          <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-400">{protein}<span className="text-xl"> g</span></div>
          {proteinShare >= 20 && (
            <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              High protein · {proteinShare}% of calories
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Calories</div>
          <div className="text-3xl font-bold">{calories}<span className="text-base font-medium"> kcal</span></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {MACROS.map(({ key, label }) => (
          <div key={key} className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900">
            <div className="text-lg font-semibold">{num(result[key])} g</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {added && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-900/30">
          <span className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
            <Check size={18} /> Added to {mealLabel(added)}
          </span>
          <Link to="/track" className="font-semibold text-blue-600 dark:text-blue-400">View tracker →</Link>
        </div>
      )}
    </div>
  )
}
