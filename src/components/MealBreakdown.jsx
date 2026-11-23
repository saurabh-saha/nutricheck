import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, X } from "lucide-react";
import { nutritionFor, isMeasure } from "../utils/units";
import { amountLabel, breakdownTotal } from "../utils/multiFood";

const STEP = (unit) => (isMeasure(unit) ? 25 : 0.5);

/**
 * A long search, split into the foods it names. Collapsed it is one line, so
 * the page stays short; open, each food has an amount you can nudge or drop.
 * rows: [{ item, quantity, unit, removed }]
 */
export default function MealBreakdown({ rows, onChange }) {
  const [open, setOpen] = useState(false);
  const live = rows.filter((r) => !r.removed);
  const total = breakdownTotal(rows);
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            {live.length} {live.length === 1 ? "food" : "foods"} · tap to {open ? "hide" : "see"} the split
          </span>
          <span className="mt-0.5 block truncate font-semibold text-gray-900 dark:text-gray-100">
            {live.map((r) => r.item.name).join(", ") || "Nothing selected"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{total.calories ?? 0}</span>
          <span className="block text-[10px] text-gray-500">kcal · {total.protein ?? 0} g protein</span>
        </span>
        {open ? <ChevronUp size={18} className="shrink-0 text-gray-400" /> : <ChevronDown size={18} className="shrink-0 text-gray-400" />}
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
          {rows.map((r, i) => {
            const n = nutritionFor(r.item, r.quantity, r.unit) || {};
            return (
              <li key={`${r.item.name}-${i}`} className={`flex items-center gap-2 px-3 py-2.5 ${r.removed ? "opacity-40" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium text-gray-900 dark:text-gray-100 ${r.removed ? "line-through" : ""}`}>{r.item.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {n.calories ?? 0} kcal · {n.protein ?? 0} g protein
                  </span>
                </span>
                {!r.removed && (
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label={`Less ${r.item.name}`}
                      onClick={() => update(i, { quantity: Math.max(STEP(r.unit), +(r.quantity - STEP(r.unit)).toFixed(2)) })}
                      className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"><Minus size={14} /></button>
                    <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums">{amountLabel(r.quantity, r.unit)}</span>
                    <button type="button" aria-label={`More ${r.item.name}`}
                      onClick={() => update(i, { quantity: +(r.quantity + STEP(r.unit)).toFixed(2) })}
                      className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"><Plus size={14} /></button>
                  </span>
                )}
                <button type="button" aria-label={r.removed ? `Put back ${r.item.name}` : `Remove ${r.item.name}`}
                  onClick={() => update(i, { removed: !r.removed })}
                  className="grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:text-gray-700">
                  {r.removed ? <Plus size={14} /> : <X size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
