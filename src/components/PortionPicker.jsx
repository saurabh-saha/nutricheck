import { Minus, Plus } from "lucide-react";
import { UNITS, unitInfo, isMeasure } from "../utils/units";

const COUNT_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const MEASURE_PRESETS = { g: [50, 100, 150, 200, 300], ml: [100, 150, 200, 250, 500] };
const SHORT_LABEL = { bowl: "Bowl", piece: "Piece", plate: "Plate", cup: "Cup", g: "g", ml: "ml" };
// Only units whose size isn't obvious get a hint.
const SIZE_HINT = { bowl: "1 bowl ≈ 250 ml katori", cup: "1 cup ≈ 240 ml glass", plate: "1 plate = a full serving" };

const stepCount = (q, dir) => {
  const i = COUNT_STEPS.findIndex((s) => s >= q);
  const idx = i === -1 ? COUNT_STEPS.length - 1 : i;
  if (dir > 0) return COUNT_STEPS[Math.min(COUNT_STEPS.length - 1, COUNT_STEPS[idx] > q ? idx : idx + 1)];
  return COUNT_STEPS[Math.max(0, idx - 1)];
};

const fmt = (q) => ({ 0.25: "¼", 0.5: "½", 0.75: "¾", 1.5: "1½", 2.5: "2½" }[q] ?? String(q));

const roundBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-gray-800 shadow-sm active:scale-95 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-100";

// Inline amount editor: a quantity control and unit pills, no extra chrome.
export default function PortionPicker({ quantity, setQuantity, unit, setUnit }) {
  const chooseUnit = (key) => {
    if (key === unit) return;
    if (isMeasure(key)) setQuantity(MEASURE_PRESETS[key][1]);
    else if (isMeasure(unit)) setQuantity(1);
    setUnit(key);
  };

  return (
    <div className="space-y-3">
      {isMeasure(unit) ? (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-gray-700">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 bg-transparent text-base font-semibold text-gray-900 focus:outline-none dark:text-white"
              aria-label={`Amount in ${unit}`}
            />
            <span className="text-sm text-gray-500 dark:text-gray-300">{unit}</span>
          </label>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {MEASURE_PRESETS[unit].map((p) => (
              <button key={p} type="button" onClick={() => setQuantity(p)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-sm ${quantity === p ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQuantity(stepCount(quantity, -1))}
            disabled={quantity <= COUNT_STEPS[0]} aria-label="Less" className={roundBtn}>
            <Minus size={16} />
          </button>
          <span className="min-w-[2.5rem] text-center text-2xl font-semibold tabular-nums text-gray-900 dark:text-white" aria-live="polite">
            {fmt(quantity)}
          </span>
          <button type="button" onClick={() => setQuantity(stepCount(quantity, 1))}
            disabled={quantity >= COUNT_STEPS[COUNT_STEPS.length - 1]} aria-label="More" className={roundBtn}>
            <Plus size={16} />
          </button>
        </div>
      )}

      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="radiogroup" aria-label="Unit">
        {UNITS.map((u) => {
          const active = u.key === unit;
          return (
            <button
              key={u.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => chooseUnit(u.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-700"}`}
            >
              {SHORT_LABEL[u.key] ?? unitInfo(u.key)?.label}
            </button>
          );
        })}
      </div>
      {SIZE_HINT[unit] && <p className="px-1 text-xs text-gray-500 dark:text-gray-400">{SIZE_HINT[unit]}</p>}
    </div>
  );
}
