// Nutrition for the chosen dish, protein first.
const MACROS = [
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
  { key: "fiber", label: "Fiber" },
];

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export default function NutritionResult({ result }) {
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
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        AI estimate, not medical advice. Values can vary by recipe and portion.
      </p>
    </div>
  )
}
