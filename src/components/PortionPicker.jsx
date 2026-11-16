import { Minus, Plus, Soup, Egg, UtensilsCrossed, Coffee, Scale, GlassWater } from "lucide-react";
import { UNITS, unitInfo, isMeasure } from "../utils/units";

const UNIT_ICONS = { bowl: Soup, piece: Egg, plate: UtensilsCrossed, cup: Coffee, g: Scale, ml: GlassWater };

const COUNT_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const MEASURE_PRESETS = { g: [50, 100, 150, 200, 300], ml: [100, 150, 200, 250, 500] };


const stepCount = (q, dir) => {
  const i = COUNT_STEPS.findIndex((s) => s >= q);
  const idx = i === -1 ? COUNT_STEPS.length - 1 : i;
  if (dir > 0) return COUNT_STEPS[Math.min(COUNT_STEPS.length - 1, COUNT_STEPS[idx] > q ? idx : idx + 1)];
  return COUNT_STEPS[Math.max(0, idx - 1)];
};

const fmt = (q) => ({ 0.25: "¼", 0.5: "½", 0.75: "¾", 1.5: "1½", 2.5: "2½" }[q] ?? String(q));

// How much: unit cards (one-colour icons) plus a stepper, or presets for grams/ml.
export default function PortionPicker({ quantity, setQuantity, unit, setUnit }) {
  const info = unitInfo(unit);

  const chooseUnit = (key) => {
    if (key === unit) return;
    if (isMeasure(key)) setQuantity(MEASURE_PRESETS[key][1]);
    else if (isMeasure(unit)) setQuantity(1);
    setUnit(key);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">How much?</span>

      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Unit">
        {UNITS.map((u) => {
          const active = u.key === unit;
          const Icon = UNIT_ICONS[u.key];
          return (
            <button
              key={u.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => chooseUnit(u.key)}
              className={`w-[4.5rem] shrink-0 snap-start rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {Icon && <Icon size={20} className={`mx-auto ${active ? "text-white" : "text-gray-500 dark:text-gray-400"}`} />}
              <div className="mt-1 text-xs font-medium">{u.label}</div>
              <div className={`text-[10px] ${active ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>{u.short}</div>
            </button>
          );
        })}
      </div>

      {info && <p className="px-1 text-xs text-gray-500 dark:text-gray-400">{info.help}</p>}

      {isMeasure(unit) ? (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 bg-transparent text-base text-gray-900 focus:outline-none dark:text-gray-100"
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${quantity === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}
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
            className="grid h-11 w-11 place-items-center rounded-full border border-gray-300 bg-white text-gray-800 active:scale-95 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <Minus size={18} />
          </button>
          <div className="min-w-[5.5rem] text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{fmt(quantity)}</div>
            <div className="text-xs text-gray-500">{info?.label.toLowerCase()}{quantity > 1 ? "s" : ""}</div>
          </div>
          <button
            type="button"
            onClick={() => setQuantity(stepCount(quantity, 1))}
            disabled={quantity >= COUNT_STEPS[COUNT_STEPS.length - 1]}
            aria-label="More"
            className="grid h-11 w-11 place-items-center rounded-full border border-gray-300 bg-white text-gray-800 active:scale-95 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
