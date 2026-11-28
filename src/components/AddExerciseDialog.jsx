import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, Dumbbell, Minus, Plus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import DateChip from "./DateChip"
import { toast } from "../hooks/use-toast"
import { fuzzyFilter } from "../utils/fuzzy"
import { logExercise } from "../utils/exerciseTracker"
import { getTodayDate } from "../utils/nutritionTracker"
import {
  CATEGORIES, EXERCISES, INTENSITIES, DEFAULT_WEIGHT_KG,
  exerciseById, categoryLabel, caloriesBurned, describeAmount,
} from "../utils/exercises"

const HINT = { reps: "sets × reps", time: "minutes", distance: "kilometres", steps: "steps" }

// A number you can nudge with - / + or type.
function Stepper({ label, value, onChange, step = 1, min = 1, max = 99999, suffix = "", quick = [] }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? n : min)))
  const round = (n) => +n.toFixed(2)
  return (
    <div className="rounded-2xl bg-gray-100 p-3 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label={`Less ${label}`} onClick={() => set(round(value - step))}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-700 shadow-sm active:scale-95 dark:bg-gray-700 dark:text-gray-100"><Minus size={16} /></button>
          <span className="flex min-w-[5.5rem] items-baseline justify-center gap-1">
            <input type="number" inputMode="decimal" aria-label={label} value={value}
              onChange={(e) => set(round(Number(e.target.value)))}
              className="w-16 bg-transparent text-center text-xl font-bold tabular-nums text-gray-900 outline-none dark:text-white" />
            {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
          </span>
          <button type="button" aria-label={`More ${label}`} onClick={() => set(round(value + step))}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-700 shadow-sm active:scale-95 dark:bg-gray-700 dark:text-gray-100"><Plus size={16} /></button>
        </span>
      </div>
      {quick.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => set(q)} aria-pressed={value === q}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${value === q ? "bg-blue-600 text-white" : "bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-200"}`}>{q}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Add exercise: pick by part of the body or by name, say how many (sets × reps,
 * minutes, km or steps), and see roughly what it burns. The sheet stays open so
 * a whole workout goes in one visit.
 * prefill: { exerciseId, minutes?, intensity?, nonce } (a suggestion that was tapped)
 */
export default function AddExerciseDialog({ open, onOpenChange, date = null, weightKg = DEFAULT_WEIGHT_KG, prefill = null, onAdded }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [category, setCategory] = useState("all")
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState(null) // exercise id
  const [amount, setAmount] = useState({})
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState([]) // what went in during this visit

  useEffect(() => {
    if (!open) return
    setSelectedDate(date || getTodayDate())
    setSession([])
    if (!prefill) { setPicked(null); setQuery("") }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id, overrides = {}) => {
    const ex = exerciseById(id)
    if (!ex) return
    setPicked(id)
    setAmount({ ...(ex.kind === "time" ? { intensity: "moderate" } : {}), ...ex.defaults, ...overrides })
  }

  useEffect(() => {
    if (open && prefill?.exerciseId) choose(prefill.exerciseId, { ...(prefill.minutes ? { minutes: prefill.minutes } : {}), ...(prefill.intensity ? { intensity: prefill.intensity } : {}) })
  }, [prefill?.nonce, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const inCategory = category === "all" ? EXERCISES : EXERCISES.filter((e) => e.category === category)
    const q = query.trim()
    return q.length >= 2 ? fuzzyFilter(q, EXERCISES, (e) => e.name) : inCategory
  }, [category, query])

  const exercise = picked ? exerciseById(picked) : null
  const kcal = exercise ? caloriesBurned(exercise, amount, weightKg) : 0
  const patch = (p) => setAmount((a) => ({ ...a, ...p }))

  const handleAdd = async () => {
    if (!exercise || !kcal || saving) return
    setSaving(true)
    try {
      const saved = await logExercise({
        exerciseId: exercise.id, name: exercise.name, category: exercise.category,
        kind: exercise.kind, amount, calories: kcal, date: selectedDate,
      })
      onAdded?.(saved)
      setSession((s) => [...s, { id: saved.id, text: `${exercise.name} ${describeAmount(exercise, amount)}`, kcal }])
      toast({ title: `🔥 ${kcal} kcal burned`, description: `${exercise.name} · ${describeAmount(exercise, amount)}` })
      setPicked(null)
      setQuery("")
    } catch (err) {
      console.error("Couldn't add exercise:", err)
      toast({ title: "Couldn't add that", description: "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const sessionKcal = session.reduce((t, s) => t + s.kcal, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="mobile-sheet w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)] gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] top-auto bottom-0 translate-y-0 rounded-t-3xl border-0 bg-gray-50 dark:bg-gray-900 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-3 pr-9">
            <DialogTitle className="flex items-center gap-2 text-left text-lg"><Dumbbell size={18} className="text-orange-500" /> Add exercise</DialogTitle>
            <DateChip value={selectedDate} onChange={setSelectedDate} />
          </div>
        </DialogHeader>

        {session.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p className="flex items-center gap-1.5 font-semibold"><Check size={15} /> Added · {sessionKcal} kcal burned</p>
            <p className="mt-0.5 text-xs opacity-80">{session.map((s) => s.text).join(" · ")}</p>
          </div>
        )}

        {!exercise ? (
          <>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: pull-ups, badminton, yoga…" aria-label="Search exercises"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" />
            </div>

            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6" role="group" aria-label="Part of the body">
              {[{ key: "all", label: "All" }, ...CATEGORIES].map((c) => (
                <button key={c.key} type="button" aria-pressed={category === c.key && query.trim().length < 2}
                  onClick={() => { setCategory(c.key); setQuery("") }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${category === c.key && query.trim().length < 2 ? "bg-blue-600 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <p className="rounded-2xl bg-gray-100 p-4 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">No match. Try another word, or pick a part of the body above.</p>
            ) : (
              <ul className="max-h-[46dvh] divide-y divide-gray-100 overflow-y-auto rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                {list.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => choose(e.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{e.name}</span>
                        <span className="block text-xs text-gray-500">{categoryLabel(e.category)} · {HINT[e.kind]}</span>
                      </span>
                      <Plus size={18} className="shrink-0 text-blue-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => setPicked(null)} className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
              <ChevronLeft size={16} /> All exercises
            </button>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{exercise.name}</p>
              <p className="text-sm text-gray-500">{categoryLabel(exercise.category)}</p>
            </div>

            {exercise.kind === "reps" && (
              <>
                <Stepper label="Sets" value={amount.sets ?? 3} onChange={(v) => patch({ sets: Math.round(v) })} max={20} quick={[1, 2, 3, 4, 5]} />
                <Stepper label="Reps per set" value={amount.reps ?? 12} onChange={(v) => patch({ reps: Math.round(v) })} max={500} quick={[6, 8, 10, 12, 15, 20]} />
              </>
            )}
            {exercise.kind === "time" && (
              <>
                <Stepper label="Time" value={amount.minutes ?? 30} onChange={(v) => patch({ minutes: Math.round(v) })} step={5} max={600} suffix="min" quick={[10, 15, 20, 30, 45, 60]} />
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup" aria-label="Intensity">
                  {INTENSITIES.map((i) => (
                    <button key={i.key} type="button" role="radio" aria-checked={amount.intensity === i.key} onClick={() => patch({ intensity: i.key })}
                      className={`rounded-lg py-2 text-sm font-medium ${amount.intensity === i.key ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>{i.label}</button>
                  ))}
                </div>
              </>
            )}
            {exercise.kind === "distance" && (
              <Stepper label="Distance" value={amount.km ?? 3} onChange={(v) => patch({ km: v })} step={0.5} min={0.5} max={300} suffix="km" quick={[1, 2, 3, 5, 10]} />
            )}
            {exercise.kind === "steps" && (
              <Stepper label="Steps" value={amount.steps ?? 6000} onChange={(v) => patch({ steps: Math.round(v) })} step={500} min={100} max={100000} quick={[2000, 4000, 6000, 8000, 10000]} />
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              An estimate for {Math.round(weightKg)} kg, counting only the extra calories beyond what you burn at rest anyway.
            </p>

            <button type="button" onClick={handleAdd} disabled={!kcal || saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-orange-500 px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50">
              <Plus size={18} /> Add · {kcal} kcal burned
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
