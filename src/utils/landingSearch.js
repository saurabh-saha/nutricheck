// What the home page shows on arrival.
// - A marketing link can set it: /?q=paneer%20tikka&qty=2&unit=plate
//   (also accepts ?search= / ?dish=). That runs a real (server-cached) search.
// - Otherwise we show a built-in example (4 eggs) instantly, with no AI call,
//   to show off high-protein results.
import { UNITS } from "./units.js";

// Typical values for large eggs (~50 g each).
export const DEFAULT_EXAMPLE = {
  dish: "egg",
  quantity: 4,
  unit: "piece",
  photoUrl: "/demo/eggs.jpg",
  note: "Example: 4 eggs. Pick one to see the full breakdown, or search your own dish above.",
  results: [
    { name: "Boiled eggs", image: "protein.webp",
      nutrition: { calories: 312, protein: 25, fat: 21, carbs: 2, vitamins: 0, minerals: 0, fiber: 0 } },
    { name: "Egg white omelette", image: "protein.webp",
      nutrition: { calories: 120, protein: 22, fat: 3, carbs: 2, vitamins: 0, minerals: 0, fiber: 0 } },
    { name: "Masala omelette", image: "goodfats.jpg",
      nutrition: { calories: 390, protein: 26, fat: 29, carbs: 6, vitamins: 0, minerals: 0, fiber: 1 } },
  ],
};

const clampQty = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 1000 ? n : null;
};

// Read ?q / ?search / ?dish, ?qty, ?unit from a URL search string.
export function landingSearchFrom(search) {
  const p = new URLSearchParams(search);
  const q = (p.get("q") || p.get("search") || p.get("dish") || "").trim().slice(0, 80);
  if (!q) return { ...DEFAULT_EXAMPLE, example: true };
  const unitParam = (p.get("unit") || "").toLowerCase();
  const unit = UNITS.some((u) => u.key === unitParam) ? unitParam : "bowl";
  return {
    dish: q,
    quantity: clampQty(p.get("qty") || p.get("quantity")) ?? 1,
    unit,
    example: false,
    autoSearch: true,
  };
}
