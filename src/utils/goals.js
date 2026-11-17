// Goal maths for the Profile page: calories from a goal weight + pace,
// and macro targets the user can tune with sliders.
import { safetyFlags, bmiOf } from "./nutritionHistory.jsx";

export const KCAL_PER_KG = 7700; // energy in ~1 kg of body fat
export const PACES = [
  { key: "easy", label: "Easy", kgPerWeek: 0.25 },
  { key: "steady", label: "Steady", kgPerWeek: 0.5 },
  { key: "fast", label: "Fast", kgPerWeek: 0.75 },
];
export const paceOf = (key) => PACES.find((p) => p.key === key) ?? PACES[1];

const num = (v) => Number(v) || 0;

export function bmrOf({ age, sex, height, weight }) {
  if (!num(age) || !num(height) || !num(weight)) return null;
  const base = 10 * num(weight) + 6.25 * num(height) - 5 * num(age);
  return sex === "female" ? base - 161 : base + 5;
}

// Calories per day to maintain the current weight.
export const maintenanceOf = (profile) => {
  const bmr = bmrOf(profile);
  return bmr ? bmr * (num(profile.activityLevel) || 1.2) : null;
};

// Lowest goal weight we offer: BMI 18.5 (or the current weight for teens / low BMI).
export function goalWeightRange(profile) {
  const w = num(profile.weight);
  const h = num(profile.height) / 100;
  const healthyMin = h > 0 ? Math.ceil(18.5 * h * h) : Math.round(w * 0.7);
  const min = safetyFlags(profile).blocksLoss ? w : Math.min(w, healthyMin);
  return { min: Math.round(min), max: Math.round(w + 25) };
}

/**
 * Daily calories for reaching goalWeight at a pace.
 * Returns { calories, maintenance, goal, weeks, floored } (floored = we stopped at a safe minimum).
 */
export function planFor(profile, goalWeight, paceKey = "steady") {
  const maintenance = maintenanceOf(profile);
  if (!maintenance) return null;
  const diff = num(goalWeight) - num(profile.weight); // kg to gain (+) or lose (-)
  const goal = Math.abs(diff) < 0.5 ? "maintain" : diff < 0 ? "lose" : "gain";
  if (goal === "maintain") return { calories: Math.round(maintenance), maintenance: Math.round(maintenance), goal, weeks: 0, floored: false };

  const pace = paceOf(paceKey).kgPerWeek;
  let daily = (pace * KCAL_PER_KG) / 7;
  let calories = goal === "lose" ? maintenance - daily : maintenance + daily;
  // Never below BMR or 1200 (women) / 1500 (men) kcal.
  const floor = Math.max(bmrOf(profile), profile.sex === "female" ? 1200 : 1500);
  let floored = false;
  if (goal === "lose" && calories < floor) { calories = floor; daily = maintenance - floor; floored = true; }
  const kgPerWeek = (daily * 7) / KCAL_PER_KG;
  const weeks = kgPerWeek > 0 ? Math.ceil(Math.abs(diff) / kgPerWeek) : null;
  return { calories: Math.round(calories), maintenance: Math.round(maintenance), goal, weeks, floored };
}

// Default split: 20% protein, 30% fat, the rest carbs; fiber 14 g per 1000 kcal.
export function recommendedTargets(calories) {
  const protein = Math.round((calories * 0.2) / 4);
  const fat = Math.round((calories * 0.3) / 9);
  return withCarbs({ calories: Math.round(calories), protein, fat, fiber: Math.round((calories / 1000) * 14) });
}

// Carbs fill whatever calories protein and fat leave.
export function withCarbs(t) {
  const carbs = Math.max(0, Math.round((t.calories - t.protein * 4 - t.fat * 9) / 4));
  return { ...t, carbs };
}

// Share of calories from each macro (for the split bar).
export function macroSplit({ calories, protein, fat, carbs }) {
  const total = Math.max(1, calories);
  return {
    protein: Math.round((protein * 4 * 100) / total),
    fat: Math.round((fat * 9 * 100) / total),
    carbs: Math.max(0, Math.round((carbs * 4 * 100) / total)),
  };
}

// Friendly checks shown under the sliders.
export function targetNotes(targets, weight) {
  const notes = [];
  const w = num(weight);
  const perKg = w ? targets.protein / w : null;
  if (perKg !== null && perKg < 0.8) notes.push("Protein is below the usual minimum (0.8 g per kg).");
  if (perKg !== null && perKg > 2.2) notes.push("That's more protein than most people need (over 2.2 g per kg).");
  if (macroSplit(targets).fat < 20) notes.push("Fat under 20% of calories can be hard to sustain.");
  if (targets.protein * 4 + targets.fat * 9 > targets.calories) notes.push("Protein and fat use up all your calories; there's nothing left for carbs.");
  return notes;
}

// What the rest of the app reads as the daily goal.
export const toIntake = (t) => ({ calories: t.calories, protein: t.protein, fat: t.fat, carbs: t.carbs, fiber: t.fiber, vitamins: 100, minerals: 100 });

export const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

export { bmiOf };
