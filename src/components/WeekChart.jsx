import { useMemo, useState } from "react"
import { getHistoricalSummary } from "../utils/nutritionTracker"

const METRICS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
]
const H = 140 // bar area height in px

/** Last 7 days for one nutrient, with the goal line. Tap a day to open it. */
export default function WeekChart({ history, intake, selectedDate, onSelectDate }) {
  const [metric, setMetric] = useState("calories")
  const days = useMemo(() => getHistoricalSummary(history), [history])
  const m = METRICS.find((x) => x.key === metric)
  const goal = Number(intake[metric]) || 0
  const values = days.map((d) => Math.round(d[metric] || 0))
  const logged = values.filter((v) => v > 0)
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0
  const top = Math.max(goal * 1.25, ...values, 1)

  return (
    <section className="rounded-3xl bg-gray-50 p-4 dark:bg-gray-800/70">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">This week</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">avg {avg.toLocaleString()} {m.unit} · goal {Math.round(goal).toLocaleString()}</span>
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
        {METRICS.map((x) => (
          <button key={x.key} type="button" onClick={() => setMetric(x.key)} aria-pressed={metric === x.key}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${metric === x.key
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300"}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="relative mt-4" style={{ height: H + 22 }}>
        {goal > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gray-400 dark:border-gray-500"
            style={{ top: H - (goal / top) * H }} aria-hidden>
            <span className="absolute -top-4 right-0 text-[10px] text-gray-500">goal</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-end justify-between gap-2" style={{ height: H }}>
          {days.map((d, i) => {
            const v = values[i]
            const sel = d.date === selectedDate
            const over = metric === "calories" && goal && v > goal * 1.1
            return (
              <button key={d.date} type="button" onClick={() => onSelectDate(d.date)} aria-label={`${d.date}: ${v} ${m.unit}`}
                className="flex h-full flex-1 flex-col justify-end">
                <span className={`block w-full rounded-t-lg transition-all ${over ? "bg-rose-400" : "bg-blue-500"} ${sel ? "opacity-100" : "opacity-40"}`}
                  style={{ height: v ? Math.max(4, (v / top) * H) : 2 }} />
              </button>
            )
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2">
          {days.map((d) => (
            <span key={d.date} className={`flex-1 text-center text-[11px] ${d.date === selectedDate ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`}>
              {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
