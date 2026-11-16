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
