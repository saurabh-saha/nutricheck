import { useEffect, useMemo, useState } from "react"
import { Sparkles, ChevronRight } from "lucide-react"
import { getMealIdeas } from "../utils/gemini.jsx"
import { MEALS, defaultMealForNow, getTodayDate } from "../utils/nutritionTracker"
import { cleanDishLabel, parseFoodQuery, unitInfo, isMeasure } from "../utils/units"

const CACHE_KEY = "mealIdeas"
const foodName = (dish) => parseFoodQuery(cleanDishLabel(dish || "")).food.trim()
const amount = (q, unit) => (isMeasure(unit) ? `${q} ${unit}` : `${q} ${(unitInfo(unit)?.label ?? unit).toLowerCase()}${q > 1 ? "s" : ""}`)

// The meal to plan for: the one for this time of day, or the next one not logged yet.
function nextMeal(todayEntries, now = new Date()) {
  const logged = new Set(todayEntries.map((e) => e.meal))
  const order = MEALS.map((m) => m.key)
  for (let i = order.indexOf(defaultMealForNow(now)); i < order.length; i++) {
    if (!logged.has(order[i])) return order[i]
  }
  return null // dinner's in: nothing left to plan
}

// Dishes this person eats most, for this meal first.
function usualDishes(history, meal) {
  const count = (entries) => {
    const c = new Map()
    for (const e of entries) {
      const n = foodName(e.dish)
      if (n) c.set(n, (c.get(n) || 0) + 1)
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  }
  const forMeal = count(history.filter((e) => e.meal === meal))
  return [...new Set([...forMeal, ...count(history)])].slice(0, 6)
}

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") } catch { return null } }

/**
 * "Ideas for lunch": 3 dishes for the coming meal, based on what's been eaten
 * today and what the person usually eats. Asks the AI at most once an hour.
 */
export default function MealIdeas({ history, loaded, intake, onPick }) {
  const today = getTodayDate()
  const todayEntries = useMemo(() => history.filter((e) => e.date === today), [history, today])
  const meal = nextMeal(todayEntries)
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
    const eaten = todayEntries.reduce((s, e) => {
      for (const k of ["calories", "protein", "carbs", "fat", "fiber"]) s[k] += Number(e.nutrition?.[k]) || 0
      return s
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
    getMealIdeas({
      meal, eaten, targets: intake,
      usual: usualDishes(history, meal),
      today: todayEntries.map((e) => foodName(e.dish)).filter(Boolean),
    }).then((ideas) => {
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
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
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
