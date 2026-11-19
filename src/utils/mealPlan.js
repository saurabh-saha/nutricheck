// What to plan for next and what someone usually eats.
// Pure module (no Firebase): shared by the app and the reminder emails, so both
// ask the AI the same question and get the same (cached) meal ideas.
import { cleanDishLabel, parseFoodQuery } from "./units.js";

export const MEAL_KEYS = ["breakfast", "lunch", "snack", "dinner"];
const NUM_KEYS = ["calories", "protein", "carbs", "fat", "fiber"];

// Sensible meal slot for an hour of the day (0-23).
export function mealForHour(h) {
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 15 && h < 18) return "snack";
  return "dinner";
}

// The meal for this hour, or the next one not logged yet; null once dinner's in.
export function nextMeal(todayEntries, hour) {
  const logged = new Set(todayEntries.map((e) => e.meal));
  for (let i = MEAL_KEYS.indexOf(mealForHour(hour)); i < MEAL_KEYS.length; i++) {
    if (!logged.has(MEAL_KEYS[i])) return MEAL_KEYS[i];
  }
  return null;
}

export const foodName = (dish) => parseFoodQuery(cleanDishLabel(dish || "")).food.trim();

// Most-eaten dish names (ties by name, so every device gets the same list).
const ranked = (entries) => {
  const c = new Map();
  for (const e of entries) {
    const n = foodName(e.dish);
    if (n) c.set(n, (c.get(n) || 0) + 1);
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
};

// Dishes this person eats most, for this meal first (or overall without a meal).
export function usualDishes(history, meal = null) {
  const forMeal = meal ? ranked(history.filter((e) => e.meal === meal)) : [];
  return [...new Set([...forMeal, ...ranked(history)])].slice(0, 6);
}

const num = (v) => parseFloat(String(v ?? 0).replace(/[^\d.-]/g, "")) || 0;
export const eatenOf = (entries) => entries.reduce((s, e) => {
  for (const k of NUM_KEYS) s[k] += num(e.nutrition?.[k]);
  return s;
}, Object.fromEntries(NUM_KEYS.map((k) => [k, 0])));

/**
 * The question behind "Ideas for dinner": meal, what's eaten today, targets,
 * usual dishes and today's dish names. Null when there's nothing left to plan.
 */
export function ideasInput({ history, day, hour, intake }) {
  const todayEntries = history.filter((e) => e.date === day);
  const meal = nextMeal(todayEntries, hour);
  if (!meal) return null;
  return {
    meal,
    eaten: eatenOf(todayEntries),
    targets: intake,
    usual: usualDishes(history, meal),
    today: [...new Set(todayEntries.map((e) => foodName(e.dish)).filter(Boolean))].sort(),
  };
}
