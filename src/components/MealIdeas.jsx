import { useEffect, useMemo, useState } from "react"
import { Sparkles, ChevronRight } from "lucide-react"
import { getMealIdeas } from "../utils/gemini.jsx"
import { MEALS, getTodayDate } from "../utils/nutritionTracker"
import { unitInfo, isMeasure } from "../utils/units"
import { ideasInput } from "../utils/mealPlan"

const CACHE_KEY = "mealIdeas"
const amount = (q, unit) => (isMeasure(unit) ? `${q} ${unit}` : `${q} ${(unitInfo(unit)?.label ?? unit).toLowerCase()}${q > 1 ? "s" : ""}`)

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") } catch { return null } }

/**
 * "Ideas for lunch": 3 dishes for the coming meal, based on what's been eaten
 * today and what the person usually eats. Asks the AI at most once an hour.
 */
export default function MealIdeas({ history, loaded, intake, onPick }) {
  const today = getTodayDate()
  // Same question the reminder email asks, so both show the same (cached) ideas.
  const input = useMemo(() => ideasInput({ history, day: today, hour: new Date().getHours(), intake }), [history, today, intake])
  const meal = input?.meal ?? null
  const key = meal ? `${today}:${new Date().getHours()}:${meal}` : null
  const [state, setState] = useState(() => {
    const c = readCache()
    return c?.key === key ? { key, ideas: c.ideas, loading: false } : { key: null, ideas: [], loading: false }
  })

  useEffect(() => {
    if (!loaded || !key || state.key === key) return
    const cached = readCache()
    if (cached?.key === key) { setState({ key, ideas: cached.ideas, loading: false }); return }
    let cancelled = false
    setState({ key, ideas: [], loading: true })
    getMealIdeas(input).then((ideas) => {
      if (cancelled) return
      if (ideas.length) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ key, ideas })) } catch { /* private mode */ } }
      setState({ key, ideas, loading: false })
    })
    return () => { cancelled = true }
  }, [loaded, key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!meal || (!state.loading && !state.ideas.length)) return null
  const label = MEALS.find((m) => m.key === meal)?.label.toLowerCase()

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
        <Sparkles size={18} className="text-amber-500" /> Ideas for {label}
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">· from your day so far</span>
      </h2>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
        {state.loading
          ? [0, 1, 2].map((i) => <div key={i} className="h-28 w-56 shrink-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)
          : state.ideas.map((idea) => (
            <button key={idea.name} type="button" onClick={() => onPick({ ...idea, meal })}
              className="flex w-56 shrink-0 snap-start flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left transition active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800">
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold leading-snug">{idea.name}</span>
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-gray-400" />
              </span>
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {amount(idea.quantity, idea.unit)} · {idea.nutrition.calories} kcal · {idea.nutrition.protein} g protein
              </span>
              {idea.why && <span className="mt-auto pt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{idea.why}</span>}
            </button>
          ))}
      </div>
    </section>
  )
}
