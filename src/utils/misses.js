// Nutrients someone keeps missing (or overshooting), from their recent logged days.
// Kept free of Firebase imports so it can be unit-tested.
const pad = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const KEYS = ["calories", "protein", "fiber"];
const computeSummary = (entries) => Object.fromEntries(KEYS.map((k) => [k,
  entries.reduce((s, e) => s + (parseFloat(String(e.nutrition?.[k] ?? 0).replace(/[^\d.-]/g, "")) || 0), 0)]));

export const MISS_LABELS = { fiber: "Fiber", protein: "Protein", calories: "Calories" };
const LOOKBACK_DAYS = 7;
const MIN_DAYS = 2;    // need at least this many logged days to judge
const LOW = 0.6;       // under 60% of the goal on average = a real miss
const HIGH = 1.15;     // over 115% of the calorie goal on average

/**
 * Returns [{ key, kind: "low" | "high", avg, target, pct, days }], worst first.
 * Today is left out (it isn't over yet).
 */
export function criticalMisses(history, intake, now = new Date()) {
  const byDate = new Map();
  for (const e of history) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const days = [];
  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const entries = byDate.get(formatDate(d));
    if (entries?.length) days.push(computeSummary(entries));
  }
  if (days.length < MIN_DAYS) return [];

  const avg = (k) => days.reduce((s, d) => s + (Number(d[k]) || 0), 0) / days.length;
  const out = [];
  for (const key of ["fiber", "protein"]) {
    const target = Number(intake?.[key]) || 0;
    if (!target) continue;
    const a = avg(key);
    if (a < target * LOW) out.push({ key, kind: "low", avg: Math.round(a), target: Math.round(target), pct: Math.round((a / target) * 100), days: days.length });
  }
  const cal = Number(intake?.calories) || 0;
  if (cal) {
    const a = avg("calories");
    if (a > cal * HIGH) out.push({ key: "calories", kind: "high", avg: Math.round(a), target: Math.round(cal), pct: Math.round((a / cal) * 100), days: days.length });
  }
  // Furthest from the goal first.
  return out.sort((x, y) => Math.abs(100 - y.pct) - Math.abs(100 - x.pct));
}
