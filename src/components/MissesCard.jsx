import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Plus, Sparkles } from "lucide-react"
import { criticalMisses, MISS_LABELS } from "../utils/misses"
import { getMissFixes } from "../utils/gemini.jsx"
import { MEALS } from "../utils/nutritionTracker"
import { unitInfo, isMeasure } from "../utils/units"
import { usualDishes } from "../utils/mealPlan"

const CACHE_KEY = "missFixes"
const REFRESH_DAYS = 2
const amount = (q, unit) => (isMeasure(unit) ? `${q} ${unit}` : `${q} ${(unitInfo(unit)?.label ?? unit).toLowerCase()}${q > 1 ? "s" : ""}`)
const mealLabel = (key) => MEALS.find((m) => m.key === key)?.label.toLowerCase() ?? "snack"
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") } catch { return null } }

const missLine = (m) => m.kind === "low"
  ? `${m.avg} g a day vs ${m.target} g goal`
  : `${m.avg} kcal a day vs ${m.target} kcal goal`

/**
 * "Needs attention": nutrients missed for days in a row, with 2–3 easy fixes
 * from the AI (refreshed every couple of days, or when the misses change).
 */
export default function MissesCard({ history, loaded, intake, onAddFix }) {
  const misses = useMemo(() => criticalMisses(history, intake), [history, intake])
  const signature = misses.map((m) => `${m.key}:${m.kind}`).join(",")
  const [fixes, setFixes] = useState(() => {
    const c = readCache()
    return c?.signature === signature ? c.fixes : []
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loaded || !misses.length) return
    const c = readCache()
    const fresh = c?.signature === signature && Date.now() - c.at < REFRESH_DAYS * 86400000
    if (fresh) { setFixes(c.fixes); return }
    let cancelled = false
    setLoading(true)
    getMissFixes({ misses, usual: usualDishes(history) }).then((list) => {
      if (cancelled) return
      setLoading(false)
      if (!list.length) return
      setFixes(list)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ signature, at: Date.now(), fixes: list })) } catch { /* private mode */ }
    })
    return () => { cancelled = true }
  }, [loaded, signature]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!misses.length) return null

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
      <h2 className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle size={18} /> Needs attention
      </h2>
      <ul className="mt-3 space-y-3">
        {misses.map((m) => (
          <li key={m.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {MISS_LABELS[m.key]} {m.kind === "low" ? "is low" : "is high"}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300">last {m.days} days</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{missLine(m)}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-200/70 dark:bg-amber-900/60">
              <div className={`h-full rounded-full ${m.kind === "low" ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, m.pct)}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {(loading || fixes.length > 0) && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-900/80 dark:text-amber-200/80">
            <Sparkles size={13} /> Easy fixes
          </p>
          <div className="space-y-2">
            {loading && !fixes.length
              ? [0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/70 dark:bg-gray-800/60" />)
              : fixes.map((f) => (
                <div key={f.name} className="flex items-center gap-3 rounded-2xl bg-white p-3 dark:bg-gray-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">
                      {amount(f.quantity, f.unit)} {f.name} <span className="font-normal text-gray-500 dark:text-gray-400">at {mealLabel(f.meal)}</span>
                    </p>
                    {f.why && <p className="text-xs text-emerald-700 dark:text-emerald-400">{f.why}</p>}
                  </div>
                  <button type="button" onClick={() => onAddFix(f)} aria-label={`Add ${f.name}`}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white active:scale-95">
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
