// Serving units shown to users and sent to the AI, so both mean the same thing.
// Pure module (no browser APIs): also imported by the Netlify function.
export const UNITS = [
  { key: "bowl",  label: "Bowl",  emoji: "🥣", short: "~250 ml", help: "A medium katori/bowl, about 250 ml. Dal, curry, rice, poha, cereal." },
  { key: "piece", label: "Piece", emoji: "🫓", short: "1 item",  help: "One whole item: a roti, egg, idli, dosa, banana, biscuit." },
  { key: "plate", label: "Plate", emoji: "🍛", short: "1 meal",  help: "A full plate or thali, as served. Biryani, pasta, a meal." },
  { key: "cup",   label: "Cup",   emoji: "☕", short: "~240 ml", help: "A standard cup or glass, about 240 ml. Tea, coffee, milk, juice." },
  { key: "g",     label: "Grams", emoji: "⚖️", short: "g",       help: "Weight in grams, if you weighed it. Most accurate." },
  { key: "ml",    label: "ml",    emoji: "🧃", short: "ml",      help: "Volume in millilitres, for drinks and liquids." },
];

export const unitInfo = (key) => UNITS.find((u) => u.key === key);

// How the AI should read "2 bowl of dal".
export const describeServing = (quantity, unit, dish) => {
  const u = unitInfo(unit);
  const amount = `${quantity} ${unit}`;
  return u ? `${amount} of ${dish} (${unit} = ${u.help.split(".")[0].toLowerCase()})` : `${amount} of ${dish}`;
};

// Fix labels saved by an older bug: "4 piece of 4 piece of idli" -> "4 piece of idli".
export const cleanDishLabel = (label) => {
  let s = String(label || "").trim();
  const re = /^(\d+(?:\.\d+)?\s+\S+\s+of\s+)(\d+(?:\.\d+)?\s+\S+\s+of\s+)/i;
  while (re.test(s)) s = s.replace(re, "$1");
  return s;
};

export const isMeasure = (unit) => unit === "g" || unit === "ml";

// ---- Understanding what people type -------------------------------------

const UNIT_WORDS = {
  bowl: ["bowl", "bowls", "katori", "katoris"],
  piece: ["piece", "pieces", "pc", "pcs", "nos", "no"],
  plate: ["plate", "plates", "thali", "thalis"],
  cup: ["cup", "cups", "glass", "glasses", "mug", "mugs"],
  g: ["g", "gm", "gms", "gram", "grams", "gr"],
  ml: ["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"],
};
const WORD_TO_UNIT = Object.fromEntries(Object.entries(UNIT_WORDS).flatMap(([u, ws]) => ws.map((w) => [w, u])));
const NUMBER_WORDS = { half: 0.5, "½": 0.5, one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/**
 * "2 eggs" -> { quantity: 2, unit: null, food: "eggs" }
 * "200g paneer" / "200 gm paneer" -> { quantity: 200, unit: "g", food: "paneer" }
 * "1 bowl of dal" -> { quantity: 1, unit: "bowl", food: "dal" }
 * "dal" -> { quantity: null, unit: null, food: "dal" }
 */
export function parseFoodQuery(text) {
  const raw = String(text || "").trim();
  const m = raw.match(/^(\d+(?:\.\d+)?|½|half|one|two|three|four|five|six|seven|eight|nine|ten|an?)\s*([a-z]+)?\s+(?:of\s+)?(.+)$/i)
    || raw.match(/^(\d+(?:\.\d+)?)([a-z]+)\s+(?:of\s+)?(.+)$/i); // "200g paneer"
  if (!m) return { quantity: null, unit: null, food: raw };
  const [, numStr, maybeUnit, rest] = m;
  const quantity = /^\d/.test(numStr) ? Number(numStr) : NUMBER_WORDS[numStr.toLowerCase()];
  const unit = maybeUnit ? WORD_TO_UNIT[maybeUnit.toLowerCase()] ?? null : null;
  // If the word after the number wasn't a unit, it's part of the food ("2 eggs").
  const food = unit ? rest.trim() : `${maybeUnit ? `${maybeUnit} ` : ""}${rest}`.trim();
  if (!quantity || !food) return { quantity: null, unit: null, food: raw };
  return { quantity, unit, food };
}

// Typical unit for a food, so "eggs" starts on Piece and "tea" on Cup.
const FOOD_UNITS = [
  ["piece", /\b(eggs?|roti|rotis|chapati|chapatis|phulka|paratha|parathas|naan|idli|idlis|dosa|dosas|uttapam|vada|vadas|samosa|samosas|banana|bananas|apple|apples|orange|oranges|mango|biscuits?|cookies?|bread|toast|slices?|sandwich|burger|pizza slice|momos?|ladoo|laddu|gulab jamun|puri|puris|kachori|pakora|cutlet|kebab|tikki|chicken leg|drumstick)\b/i],
  ["cup", /\b(tea|chai|coffee|milk|juice|lassi|buttermilk|chaas|smoothie|shake|milkshake|coke|soda|water|kombucha|latte|cappuccino|espresso)\b/i],
  ["plate", /\b(biryani|pulao|thali|pasta|noodles|fried rice|chole bhature|pav bhaji|meal|salad bowl|maggi)\b/i],
  ["bowl", /\b(dal|daal|rice|curry|sabzi|sabji|poha|upma|oats|porridge|khichdi|soup|rajma|chole|chana|sambar|rasam|kadhi|raita|curd|dahi|yogurt|cereal|muesli|salad|paneer butter masala)\b/i],
];
export function inferUnit(food) {
  for (const [unit, re] of FOOD_UNITS) if (re.test(food || "")) return unit;
  return null;
}

// ---- Rescaling without a new search -------------------------------------

const UNIT_KEYS = ["bowl", "piece", "plate", "cup"];

// Grams in one unit of this item, if known (ml counted ~1 g).
export function gramsPerUnit(item, unit) {
  if (unit === "g" || unit === "ml") return 1;
  const g = Number(item?.unitGrams?.[unit]);
  return g > 0 ? g : null;
}

/**
 * Nutrition for `quantity` x `unit` of an item.
 * - With per-100 g data: any unit we know the grams for.
 * - Otherwise: only the unit it was searched/logged in, scaled by quantity.
 * Returns null when it can't be worked out without a new search.
 */
export function nutritionFor(item, quantity, unit) {
  if (!item) return null;
  const scale = (base, ratio) => Object.fromEntries(Object.entries(base).map(([k, v]) => {
    const n = Number(v);
    return [k, Number.isFinite(n) ? Math.round(n * ratio) : v];
  }));
  const grams = gramsPerUnit(item, unit);
  if (item.per100g && grams) return scale(item.per100g, (quantity * grams) / 100);
  if (item.nutrition && item.baseUnit === unit && item.baseQuantity > 0) {
    return scale(item.nutrition, quantity / item.baseQuantity);
  }
  return null;
}

// Keep only well-formed per-100 g / grams-per-unit data from the AI.
export function cleanPortionData(item) {
  const per100g = item?.per100g && typeof item.per100g === "object"
    && Number(item.per100g.calories) >= 0 ? item.per100g : null;
  const unitGrams = {};
  for (const k of UNIT_KEYS) {
    const g = Number(item?.unitGrams?.[k]);
    if (g > 0 && g < 5000) unitGrams[k] = Math.round(g);
  }
  const defaultUnit = UNIT_KEYS.includes(item?.defaultUnit) ? item.defaultUnit : undefined;
  return per100g ? { per100g, unitGrams, ...(defaultUnit ? { defaultUnit } : {}) } : {};
}
