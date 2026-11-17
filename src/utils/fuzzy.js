// Forgiving food-name matching, shared by the app and the server.
// Handles typos ("panner" -> paneer), doubled letters ("biriyani"), partial words
// ("pan" -> paneer) and word order. Pure JS, no dependencies.

// Lowercase, strip accents/punctuation, collapse doubled letters ("paneer" -> "paner").
export const canon = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

// Levenshtein distance, giving up early once it exceeds `max`.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Typos allowed for a typed word against a name word.
// Short words only get one typo against short names ("egs" -> egg, not veg).
const tolerance = (w, t) => (w.length <= 2 ? 0 : w.length === 3 ? (t.length <= 4 ? 1 : 0) : w.length <= 5 ? 1 : 2);

/**
 * How well `query` matches `name`: lower is better, null = no match.
 * Every typed word must match some word of the name.
 */
export function fuzzyScore(query, name) {
  const words = canon(query).split(" ").filter(Boolean);
  const tokens = canon(name).split(" ").filter(Boolean);
  if (!words.length || !tokens.length) return null;
  let total = 0;
  for (const w of words) {
    let best = Infinity;
    for (const t of tokens) {
      if (t === w) best = 0;
      else if (t.startsWith(w)) best = Math.min(best, 0.5);
      else if (w.length >= 4 && t.includes(w)) best = Math.min(best, 1); // mid-word only for 4+ letters
      else {
        const tol = tolerance(w, t);
        if (!tol) continue;
        // Compare with the whole word and with its start (for half-typed words).
        const d = Math.min(distance(w, t, tol), distance(w, t.slice(0, w.length), tol));
        if (d <= tol) best = Math.min(best, 1.5 + d);
      }
      if (best === 0) break;
    }
    if (best === Infinity) return null;
    total += best;
  }
  // Prefer shorter names when scores tie ("paneer" before "paneer butter masala").
  return total + tokens.length * 0.01;
}

export const fuzzyFilter = (query, items, getName = (x) => x) =>
  items
    .map((item) => ({ item, score: fuzzyScore(query, getName(item)) }))
    .filter((x) => x.score !== null)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
