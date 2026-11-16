import { useState } from "react";
import { Minus, Plus, HelpCircle } from "lucide-react";
import { UNITS, unitInfo } from "../utils/units";

const COUNT_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const MEASURE_PRESETS = { g: [50, 100, 150, 200, 300], ml: [100, 150, 200, 250, 500] };
const isMeasure = (unit) => unit === "g" || unit === "ml";

const stepCount = (q, dir) => {
  const i = COUNT_STEPS.findIndex((s) => s >= q);
  const idx = i === -1 ? COUNT_STEPS.length - 1 : i;
  if (dir > 0) return COUNT_STEPS[Math.min(COUNT_STEPS.length - 1, COUNT_STEPS[idx] > q ? idx : idx + 1)];
  return COUNT_STEPS[Math.max(0, idx - 1)];
};

const fmt = (q) => (q === 0.25 ? "¼" : q === 0.5 ? "½" : q === 0.75 ? "¾" : q === 1.5 ? "1½" : q === 2.5 ? "2½" : String(q));

// How much: a stepper (or grams/ml presets) plus unit cards with icons and a help guide.
export default function PortionPicker({ quantity, setQuantity, unit, setUnit }) {
  const [showHelp, setShowHelp] = useState(false);
  const info = unitInfo(unit);

  const chooseUnit = (key) => {
    if (key === unit) return;
    if (isMeasure(key)) setQuantity(MEASURE_PRESETS[key][1]);
    else if (isMeasure(unit)) setQuantity(1);
    setUnit(key);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">How much?</span>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
        >
          <HelpCircle size={14} /> What do these mean?
        </button>
      </div>

      {/* Units: swipe sideways on small screens */}
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Unit">
        {UNITS.map((u) => {
          const active = u.key === unit;
          return (
            <button
              key={u.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => chooseUnit(u.key)}
              className={`snap-start shrink-0 w-[4.5rem] rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <div className="text-xl leading-none" aria-hidden>{u.emoji}</div>
              <div className="mt-1 text-xs font-medium">{u.label}</div>
              <div className="text-[10px] text-gray-500">{u.short}</div>
            </button>
          );
        })}
      </div>

      {showHelp ? (
        <ul className="space-y-1.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {UNITS.map((u) => (
            <li key={u.key} className="flex gap-2">
              <span aria-hidden>{u.emoji}</span>
              <span><b>{u.label}:</b> {u.help}</span>
            </li>
          ))}
        </ul>
      ) : (
        info && <p className="px-1 text-xs text-gray-500 dark:text-gray-400">{info.emoji} {info.help}</p>
      )}

      {/* Amount */}
      {isMeasure(unit) ? (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 bg-transparent text-base text-gray-900 focus:outline-none"
              aria-label={`Amount in ${unit}`}
            />
            <span className="text-sm text-gray-500">{unit}</span>
          </label>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {MEASURE_PRESETS[unit].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuantity(p)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${quantity === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(stepCount(quantity, -1))}
            disabled={quantity <= COUNT_STEPS[0]}
            aria-label="Less"
            className="grid h-11 w-11 place-items-center rounded-full border border-gray-300 bg-white text-gray-800 active:scale-95 disabled:opacity-40"
          >
            <Minus size={18} />
          </button>
          <div className="min-w-[5.5rem] text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{fmt(quantity)}</div>
            <div className="text-xs text-gray-500">{info?.label.toLowerCase()}{quantity > 1 && unit !== "ml" ? "s" : ""}</div>
          </div>
          <button
            type="button"
            onClick={() => setQuantity(stepCount(quantity, 1))}
            disabled={quantity >= COUNT_STEPS[COUNT_STEPS.length - 1]}
            aria-label="More"
            className="grid h-11 w-11 place-items-center rounded-full border border-gray-300 bg-white text-gray-800 active:scale-95 disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
