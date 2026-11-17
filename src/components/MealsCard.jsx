import { Link } from "react-router-dom"
import { Sunrise, Sun, Cookie, Moon, Plus, Utensils } from "lucide-react"
import { MEALS } from "../utils/nutritionTracker"
import { cleanDishLabel } from "../utils/units"

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, snack: Cookie, dinner: Moon }
const kcal = (e) => Math.round(Number(e.nutrition?.calories) || 0)

function Thumb({ entry }) {
  const src = entry.imageUrl?.startsWith("data:") ? entry.imageUrl : entry.image ? `/${entry.image}` : null
  return src
    ? <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-cover" />
    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gray-400 dark:bg-gray-900"><Utensils size={16} /></span>
}

/** The day's food by meal, each with its own "Add" so logging is one tap away. */
export default function MealsCard({ entries, onAdd }) {
  return (
    <section className="rounded-3xl bg-gray-50 p-2 dark:bg-gray-800/70">
      {MEALS.map((m, i) => {
        const Icon = MEAL_ICONS[m.key]
        const items = entries.filter((e) => (e.meal || "snack") === m.key)
        const total = items.reduce((s, e) => s + kcal(e), 0)
        return (
          <div key={m.key} className={`p-2 ${i ? "border-t border-gray-200 dark:border-gray-700" : ""}`}>
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold">{m.label}</span>
              {total > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">· {total} kcal</span>}
              <button type="button" onClick={() => onAdd(m.key)} aria-label={`Add to ${m.label}`}
                className="ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-900/30">
                <Plus size={16} /> Add
              </button>
            </div>
            {items.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {items.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-1.5 dark:bg-gray-900/40">
                    <Thumb entry={e} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{cleanDishLabel(e.dish)}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        P {Math.round(e.nutrition?.protein || 0)}g · C {Math.round(e.nutrition?.carbs || 0)}g · F {Math.round(e.nutrition?.fat || 0)}g
                      </span>
                    </span>
                    <span className="pr-2 text-sm font-semibold">{kcal(e)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      {entries.length > 0 && (
        <Link to="/history" className="block px-2 pb-1 pt-2 text-center text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400">
          Edit or delete in History →
        </Link>
      )}
    </section>
  )
}
