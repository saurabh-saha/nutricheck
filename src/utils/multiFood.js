// Splitting "2 rotis, dal and a bowl of rice" into the foods it names.
//
// This only decides whether a search looks like several foods; the AI does the
// real work of naming and sizing them. Over-splitting is the expensive mistake
// (it turns one dish into nonsense), so the rules below stay conservative.
import { parseFoodQuery, nutritionFor, unitInfo, isMeasure } from './units.js';

// Commas, semicolons, newlines, "+" and "&" are always separators.
const HARD_SPLIT = /\s*(?:,|;|\n|\+|&)\s*/;
const AND = /\s+(?:and|aur)\s+/i;
const STARTS_WITH_AMOUNT = /^(?:\d|½|half\b|one\b|two\b|three\b|four\b|five\b|six\b|seven\b|eight\b|nine\b|ten\b|an?\b)/i;
const FILLER = /^(?:and|with|plus|also|some|a|an|the)$/i;

// "and" joins two foods ("2 rotis and dal"), but it also sits inside dish names
// ("sweet and sour chicken"). Treat it as a separator only when one side opens
// with an amount, which is how people enumerate what they ate.
const splitOnAnd = (segment) => {
  const parts = segment.split(AND);
  if (parts.length < 2) return [segment];
  const out = [];
  let buffer = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const left = buffer.trim();
    const right = parts[i].trim();
    if (STARTS_WITH_AMOUNT.test(left) || STARTS_WITH_AMOUNT.test(right)) {
      out.push(buffer);
      buffer = parts[i];
    } else {
      buffer = `${buffer} and ${parts[i]}`;
    }
  }
  out.push(buffer);
  return out;
};

/**
 * The foods a search names, in order. One food (or nothing recognisable)
 * gives a single-item array, so callers can always treat it as a list.
 */
export function splitFoodQuery(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw
    .split(HARD_SPLIT)
    .flatMap(splitOnAnd)
    .map((s) => s.trim().replace(/\.$/, '').trim())
    .filter((s) => s && !FILLER.test(s) && /[a-z]/i.test(s));
}

/** True when a search is worth breaking into separate foods. */
export const isMultiFood = (text) => splitFoodQuery(text).length > 1;

/**
 * Each food with the amount the person typed, ready for the AI:
 * "2 rotis" -> { text: '2 rotis', food: 'rotis', quantity: 2, unit: null }
 */
export const foodsInQuery = (text) =>
  splitFoodQuery(text).map((segment) => ({ text: segment, ...parseFoodQuery(segment) }));

// "2 piece" / "1 bowl" / "150 g", for one row of a breakdown.
export const amountLabel = (quantity, unit) =>
  isMeasure(unit) ? `${quantity} ${unit}` : `${quantity} ${(unitInfo(unit)?.label ?? unit).toLowerCase()}`;

// What the whole meal comes to, from the rows still included.
export const breakdownTotal = (rows) =>
  rows.filter((r) => !r.removed).reduce((sum, r) => {
    const n = nutritionFor(r.item, r.quantity, r.unit) || {};
    for (const k of ['calories', 'protein', 'carbs', 'fat', 'fiber']) sum[k] = (sum[k] || 0) + (Number(n[k]) || 0);
    return sum;
  }, {});
