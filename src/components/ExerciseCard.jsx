import { Dumbbell, Flame, Plus, Scale, X } from "lucide-react"
import { exerciseById, describeAmount } from "../utils/exercises"

/**
 * Exercise for the day on the home page: what was logged, what it burned, and,
 * when the day (or yesterday) ran over the goal, a few easy ways to even it out.
 * balance: { over, when: "today" | "yesterday", ways: [{ exercise, minutes, intensity, kcal }] } | null
 */
export default function ExerciseCard({ entries, burned, onAdd, onDelete, balance, onPickWay }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Dumbbell size={18} className="text-orange-500" /> Exercise
          {burned > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
              <Flame size={12} /> {Math.round(burned)} kcal burned
            </span>
          )}
        </h2>
        <button type="button" onClick={() => onAdd?.()}
          className="flex items-center gap-1 rounded-full bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white active:scale-95">
          <Plus size={15} /> Add
        </button>
      </div>

      {balance && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-900/20">
          <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
            <Scale size={16} className="mt-0.5 shrink-0" />
            <span>
              {balance.when === "today"
                ? <>Today is about <b>{Math.round(balance.over)} kcal</b> over.</>
                : <>Yesterday ran over: about <b>{Math.round(balance.over)} kcal</b> still to even out.</>}
              {balance.target < balance.over
                ? ` Burning around ${Math.round(balance.target)} of it is a solid session:`
                : balance.when === "yesterday" ? " An easy way to even it out today:" : " To even it out:"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {balance.ways.map((w) => (
              <button key={w.exercise.id} type="button" onClick={() => onPickWay?.(w)}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm ring-1 ring-amber-200 active:scale-95 dark:bg-gray-800 dark:text-amber-100 dark:ring-amber-800">
                {w.exercise.name.replace(/ \(.*\)$/, "")} · {w.minutes} min
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Nothing yet. Log a walk, a workout or a game, and the calories come off the day.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{e.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{describeAmount(exerciseById(e.exerciseId) ?? { kind: e.kind }, e.amount)}</span>
              </span>
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-300">−{Math.round(e.calories)} kcal</span>
              <button type="button" aria-label={`Remove ${e.name}`} onClick={() => onDelete?.(e.id)}
                className="grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
