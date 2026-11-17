import { Link } from "react-router-dom"
import { Sunrise, Sun, Cookie, Moon, Check, Flame, Target, ArrowRight, Plus } from "lucide-react"
import { MEALS, getTodayDate } from "../utils/nutritionTracker"

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, snack: Cookie, dinner: Moon }

function Ring({ value, target, size = 88 }) {
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const over = value > target
  const left = Math.round(Math.abs(target - value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" className="shrink-0"
      aria-label={`${Math.round(value)} of ${Math.round(target)} kcal`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/20" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        stroke={over ? "#fca5a5" : "#ffffff"} strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="48%" textAnchor="middle" className="fill-white text-lg font-bold">{left}</text>
      <text x="50%" y="66%" textAnchor="middle" className="fill-white/70 text-[10px]">{over ? "kcal over" : "kcal left"}</text>
    </svg>
  )
}

/**
 * "Your day" on the home page: progress toward the goal, which meals are logged,
 * and one way forward (the tracker, or setting a goal first).
 */
const MACROS = [
  { key: "protein", label: "Protein", bar: "bg-emerald-300" },
  { key: "carbs", label: "Carbs", bar: "bg-amber-300" },
  { key: "fat", label: "Fat", bar: "bg-rose-300" },
]

/**
 * "Your day" on the home page: progress toward the goal, which meals are logged
 * (tap one to add to it), and one way forward (the tracker, or setting a goal first).
 */
export default function DayCard({ date, entries, summary, intake, hasGoal, streak, activeMeal, onPickMeal }) {
  const isToday = date === getTodayDate()
  const eaten = summary.calories || 0
  const logged = new Set(entries.map((e) => e.meal))
  const empty = entries.length === 0
  const pct = (key) => (intake[key] ? Math.min(100, Math.round(((summary[key] || 0) / intake[key]) * 100)) : 0)

  const headline = empty
    ? (isToday ? "Nothing logged yet today" : "Nothing logged that day")
    : eaten > intake.calories ? "Over your goal, that's okay" : "Nice, keep it going"

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-lg">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-white/80">
        <span>{isToday ? "Your day" : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
        {streak > 1 && (
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 normal-case tracking-normal text-white">
            <Flame size={13} className="text-amber-300" /> {streak}-day streak
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Ring value={eaten} target={intake.calories} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{headline}</p>
          <p className="mt-0.5 text-sm text-white/80">{Math.round(eaten)} / {Math.round(intake.calories)} kcal</p>
          <div className="mt-2 space-y-1.5">
            {MACROS.map((m) => (
              <div key={m.key}>
                <div className="flex justify-between text-[11px] text-white/80">
                  <span>{m.label}</span><span>{Math.round(summary[m.key] || 0)} / {Math.round(intake[m.key] || 0)} g</span>
                </div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/20">
                  <div className={`h-full rounded-full ${m.bar} transition-all`} style={{ width: `${pct(m.key)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meals: logged ones are ticked; tap one to add food to it */}
      <div className="mt-4 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Add to meal">
        {MEALS.map((m) => {
          const Icon = MEAL_ICONS[m.key]
          const done = logged.has(m.key)
          const active = activeMeal === m.key
          return (
            <button key={m.key} type="button" role="radio" aria-checked={active} onClick={() => onPickMeal?.(m.key)}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition active:scale-95 ${done ? "bg-white text-blue-700" : "bg-white/10 text-white/90 hover:bg-white/20"} ${active ? "ring-2 ring-amber-300" : ""}`}>
              {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              {m.label}
              {!done && <Plus size={10} className="absolute right-1.5 top-1.5 opacity-70" />}
            </button>
          )
        })}
      </div>

      {hasGoal ? (
        <Link to="/track" className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 py-3 text-sm font-semibold transition active:scale-[0.98] hover:bg-white/25">
          See your day <ArrowRight size={16} />
        </Link>
      ) : (
        <Link to="/track" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-blue-700 transition active:scale-[0.98]">
          <Target size={16} /> Set your daily goal · 30 sec <ArrowRight size={16} />
        </Link>
      )}
    </section>
  )
}
