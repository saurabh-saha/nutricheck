// Exercises you can log, and roughly how many calories they burn.
//
// Burn = (MET - 1) x body weight (kg) x hours. The "- 1" matters: your daily
// calorie goal already includes what your body burns at rest, so only the
// EXTRA burn should be earned back. That keeps estimates on the cautious side,
// which is what you want when you're using exercise to even out a big day.
// MET values are rounded from the Compendium of Physical Activities.

export const DEFAULT_WEIGHT_KG = 70;
export const REST_SEC = 45;          // between sets
const REST_MET = 1.5;                // standing around between sets
const STEPS_PER_MIN = 100;           // an easy walking pace

export const CATEGORIES = [
  { key: "cardio", label: "Cardio" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs & glutes" },
  { key: "core", label: "Core" },
  { key: "full", label: "Full body" },
  { key: "sports", label: "Sports" },
  { key: "mind", label: "Yoga & stretch" },
  { key: "daily", label: "Daily activity" },
];

// How you count each one:
//   reps     sets x reps          (met, secPerRep)
//   time     minutes + intensity  (met: [light, moderate, hard])
//   distance kilometres           (met, kmh: the pace that met assumes)
//   steps    steps                (walking)
export const INTENSITIES = [
  { key: "light", label: "Light" },
  { key: "moderate", label: "Moderate" },
  { key: "hard", label: "Hard" },
];

const reps = (id, name, category, met, secPerRep, defaults = {}) =>
  ({ id, name, category, kind: "reps", met, secPerRep, defaults: { sets: 3, reps: 12, ...defaults } });
const time = (id, name, category, met, defaults = {}) =>
  ({ id, name, category, kind: "time", met, defaults: { minutes: 30, ...defaults } });
const distance = (id, name, category, met, kmh, defaults = {}) =>
  ({ id, name, category, kind: "distance", met, kmh, defaults: { km: 3, ...defaults } });

export const EXERCISES = [
  // ---- Cardio ----
  { id: "walk-steps", name: "Walking (steps)", category: "cardio", kind: "steps", met: 3.8, defaults: { steps: 6000 } },
  distance("walk-km", "Walking (distance)", "cardio", 3.5, 5, { km: 3 }),
  time("walk", "Walking (time)", "cardio", [2.8, 4.3, 5.0]),
  distance("run-km", "Running (distance)", "cardio", 9.0, 9, { km: 3 }),
  time("run", "Running / jogging (time)", "cardio", [7.0, 9.8, 11.5], { minutes: 20 }),
  time("treadmill", "Treadmill", "cardio", [4.0, 7.0, 10.0], { minutes: 20 }),
  distance("cycle-km", "Cycling (distance)", "cardio", 6.8, 16, { km: 6 }),
  time("cycle", "Cycling (time)", "cardio", [4.0, 6.8, 10.0]),
  time("bike", "Stationary bike", "cardio", [4.8, 7.0, 10.5], { minutes: 20 }),
  time("swim", "Swimming laps", "cardio", [5.8, 8.3, 10.0], { minutes: 20 }),
  time("skipping", "Skipping (jump rope)", "cardio", [8.8, 11.8, 12.3], { minutes: 10 }),
  time("elliptical", "Elliptical", "cardio", [5.0, 5.7, 9.0], { minutes: 20 }),
  time("stairmaster", "Stair climber", "cardio", [4.0, 6.0, 9.0], { minutes: 15 }),
  time("rowing", "Rowing machine", "cardio", [4.8, 7.0, 8.5], { minutes: 15 }),
  time("hiking", "Hiking / trekking", "cardio", [5.3, 6.0, 7.8], { minutes: 60 }),
  time("stairs", "Climbing stairs", "cardio", [4.0, 5.0, 8.8], { minutes: 10 }),
  time("hiit", "HIIT", "cardio", [8.0, 10.0, 12.0], { minutes: 20 }),
  time("zumba", "Zumba / dance workout", "cardio", [4.5, 5.5, 7.0], { minutes: 45 }),
  time("aerobics", "Aerobics", "cardio", [5.0, 6.5, 7.3], { minutes: 40 }),
  time("dance", "Dancing", "cardio", [3.5, 4.5, 6.5], { minutes: 30 }),

  // ---- Chest ----
  reps("pushup", "Push-ups", "chest", 3.8, 3),
  reps("pushup-incline", "Incline push-ups", "chest", 3.5, 3),
  reps("pushup-decline", "Decline push-ups", "chest", 4.2, 3),
  reps("pushup-diamond", "Diamond push-ups", "chest", 4.0, 3, { reps: 10 }),
  reps("bench", "Bench press", "chest", 5.0, 4, { reps: 10 }),
  reps("bench-incline", "Incline dumbbell press", "chest", 5.0, 4, { reps: 10 }),
  reps("fly", "Dumbbell fly", "chest", 4.0, 4, { reps: 12 }),
  reps("chest-dip", "Chest dips", "chest", 5.0, 3.5, { reps: 10 }),
  reps("cable-cross", "Cable crossover", "chest", 4.0, 3.5),
  reps("pec-deck", "Pec deck", "chest", 3.5, 3.5),

  // ---- Back ----
  reps("pullup", "Pull-ups", "back", 5.0, 4, { reps: 8 }),
  reps("chinup", "Chin-ups", "back", 5.0, 4, { reps: 8 }),
  reps("lat-pull", "Lat pulldown", "back", 4.5, 3.5, { reps: 10 }),
  reps("bent-row", "Bent-over row", "back", 5.0, 3.5, { reps: 10 }),
  reps("cable-row", "Seated cable row", "back", 4.5, 3.5, { reps: 12 }),
  reps("db-row", "One-arm dumbbell row", "back", 4.5, 3.5, { reps: 10 }),
  reps("deadlift", "Deadlift", "back", 6.0, 4.5, { sets: 3, reps: 8 }),
  reps("superman", "Superman hold", "back", 3.0, 3),
  reps("back-ext", "Back extension", "back", 3.8, 3),
  reps("face-pull", "Face pulls", "back", 3.5, 3, { reps: 15 }),

  // ---- Shoulders ----
  reps("ohp", "Overhead press", "shoulders", 5.0, 3.5, { reps: 10 }),
  reps("lateral", "Lateral raise", "shoulders", 3.5, 3),
  reps("front-raise", "Front raise", "shoulders", 3.5, 3),
  reps("arnold", "Arnold press", "shoulders", 4.5, 3.5, { reps: 10 }),
  reps("upright", "Upright row", "shoulders", 4.0, 3),
  reps("shrug", "Shrugs", "shoulders", 3.5, 2.5, { reps: 15 }),
  reps("pike", "Pike push-ups", "shoulders", 4.2, 3.5, { reps: 10 }),
  reps("rear-delt", "Rear delt fly", "shoulders", 3.5, 3),

  // ---- Arms ----
  reps("curl", "Bicep curls", "arms", 3.5, 3),
  reps("hammer", "Hammer curls", "arms", 3.5, 3),
  reps("conc-curl", "Concentration curls", "arms", 3.2, 3),
  reps("tri-dip", "Tricep dips", "arms", 4.5, 3),
  reps("pushdown", "Tricep pushdown", "arms", 3.5, 3),
  reps("skull", "Skull crushers", "arms", 3.8, 3.5, { reps: 10 }),
  reps("oh-tri", "Overhead tricep extension", "arms", 3.5, 3.5),
  reps("close-pushup", "Close-grip push-ups", "arms", 4.0, 3, { reps: 10 }),

  // ---- Legs & glutes ----
  reps("squat", "Squats", "legs", 5.0, 3.5, { reps: 15 }),
  reps("goblet", "Goblet squats", "legs", 5.0, 3.5),
  reps("jump-squat", "Jump squats", "legs", 6.0, 2.5, { reps: 12 }),
  reps("lunge", "Lunges", "legs", 4.5, 3),
  reps("walk-lunge", "Walking lunges", "legs", 4.5, 3, { reps: 20 }),
  reps("bulgarian", "Bulgarian split squats", "legs", 5.0, 4, { reps: 10 }),
  reps("leg-press", "Leg press", "legs", 5.0, 3.5),
  reps("leg-ext", "Leg extension", "legs", 3.8, 3),
  reps("leg-curl", "Leg curl", "legs", 3.8, 3),
  reps("rdl", "Romanian deadlift", "legs", 5.0, 4, { reps: 10 }),
  reps("calf", "Calf raises", "legs", 3.5, 2, { reps: 20 }),
  reps("glute-bridge", "Glute bridge", "legs", 3.5, 3, { reps: 15 }),
  reps("hip-thrust", "Hip thrust", "legs", 4.5, 3.5, { reps: 12 }),
  reps("step-up", "Step-ups", "legs", 5.0, 3, { reps: 12 }),
  reps("box-jump", "Box jumps", "legs", 7.0, 3.5, { reps: 10 }),
  time("wall-sit", "Wall sit", "legs", [3.0, 3.5, 4.0], { minutes: 2 }),

  // ---- Core ----
  reps("crunch", "Crunches", "core", 3.8, 2.5, { reps: 20 }),
  reps("situp", "Sit-ups", "core", 4.0, 3, { reps: 15 }),
  time("plank", "Plank", "core", [3.0, 3.3, 4.0], { minutes: 2 }),
  time("side-plank", "Side plank", "core", [2.8, 3.0, 3.5], { minutes: 2 }),
  reps("leg-raise", "Leg raises", "core", 4.0, 3, { reps: 15 }),
  reps("hang-raise", "Hanging leg raises", "core", 4.5, 3.5, { reps: 10 }),
  reps("russian", "Russian twists", "core", 4.0, 2.5, { reps: 20 }),
  reps("bicycle", "Bicycle crunches", "core", 4.0, 2.5, { reps: 20 }),
  reps("mountain", "Mountain climbers", "core", 8.0, 1.5, { reps: 30 }),
  reps("flutter", "Flutter kicks", "core", 3.8, 2, { reps: 30 }),
  reps("ab-wheel", "Ab wheel rollout", "core", 4.5, 4, { reps: 10 }),
  reps("dead-bug", "Dead bug", "core", 3.3, 3, { reps: 12 }),

  // ---- Full body ----
  reps("burpee", "Burpees", "full", 8.0, 4, { reps: 10 }),
  reps("jacks", "Jumping jacks", "full", 7.0, 1.2, { sets: 3, reps: 30 }),
  reps("high-knees", "High knees", "full", 8.0, 1, { reps: 40 }),
  reps("kb-swing", "Kettlebell swings", "full", 6.0, 2.5, { reps: 15 }),
  reps("thruster", "Thrusters", "full", 6.5, 4, { reps: 10 }),
  reps("clean-press", "Clean and press", "full", 6.5, 4, { reps: 8 }),
  reps("jump-rope-jumps", "Skipping (jump count)", "full", 11.8, 0.5, { sets: 3, reps: 100 }),
  time("bear-crawl", "Bear crawl", "full", [4.5, 5.5, 7.0], { minutes: 5 }),
  time("battle-rope", "Battle ropes", "full", [6.0, 8.0, 10.0], { minutes: 10 }),
  time("circuit", "Circuit training", "full", [4.3, 6.0, 8.0], { minutes: 30 }),
  time("crossfit", "CrossFit", "full", [6.0, 8.0, 10.0], { minutes: 40 }),
  time("weights", "Weight training (general)", "full", [3.0, 3.5, 6.0], { minutes: 45 }),
  time("calisthenics", "Calisthenics", "full", [3.8, 5.0, 8.0], { minutes: 30 }),

  // ---- Sports ----
  time("badminton", "Badminton", "sports", [4.5, 5.5, 7.0], { minutes: 45 }),
  time("cricket", "Cricket", "sports", [3.0, 4.8, 6.0], { minutes: 60 }),
  time("football", "Football / soccer", "sports", [7.0, 8.0, 10.0], { minutes: 45 }),
  time("basketball", "Basketball", "sports", [6.0, 6.5, 8.0], { minutes: 40 }),
  time("tennis", "Tennis", "sports", [5.0, 7.3, 8.0], { minutes: 45 }),
  time("table-tennis", "Table tennis", "sports", [3.0, 4.0, 5.0], { minutes: 30 }),
  time("volleyball", "Volleyball", "sports", [3.0, 4.0, 6.0], { minutes: 40 }),
  time("squash", "Squash", "sports", [7.3, 10.0, 12.0], { minutes: 40 }),
  time("kabaddi", "Kabaddi", "sports", [6.0, 7.0, 8.0], { minutes: 30 }),
  time("boxing", "Boxing / punching bag", "sports", [5.5, 7.8, 12.0], { minutes: 30 }),
  time("martial", "Martial arts", "sports", [5.0, 10.3, 10.3], { minutes: 45 }),
  time("skating", "Skating", "sports", [5.5, 7.0, 9.0], { minutes: 30 }),
  time("golf", "Golf (walking)", "sports", [3.5, 4.8, 5.5], { minutes: 90 }),
  time("climbing", "Rock climbing", "sports", [5.8, 7.5, 8.8], { minutes: 45 }),

  // ---- Yoga & stretch ----
  time("yoga", "Yoga (hatha)", "mind", [2.0, 2.5, 3.0], { minutes: 45 }),
  time("power-yoga", "Power / vinyasa yoga", "mind", [3.5, 4.0, 5.0], { minutes: 45 }),
  time("surya", "Surya Namaskar", "mind", [3.0, 4.0, 5.5], { minutes: 15 }),
  time("pilates", "Pilates", "mind", [2.8, 3.0, 4.0], { minutes: 40 }),
  time("stretch", "Stretching", "mind", [2.0, 2.3, 2.8], { minutes: 15 }),
  time("taichi", "Tai chi", "mind", [3.0, 3.5, 4.0], { minutes: 30 }),

  // ---- Daily activity ----
  time("housework", "Housework / cleaning", "daily", [2.5, 3.3, 4.0], { minutes: 45 }),
  time("gardening", "Gardening", "daily", [3.0, 3.8, 5.0], { minutes: 45 }),
  time("dog-walk", "Walking the dog", "daily", [3.0, 3.5, 4.5], { minutes: 30 }),
  time("kids", "Playing with kids", "daily", [3.0, 4.0, 5.8], { minutes: 30 }),
  time("carwash", "Washing the car", "daily", [2.3, 2.8, 3.5], { minutes: 30 }),
  time("shopping", "Walking around shopping", "daily", [2.3, 2.8, 3.5], { minutes: 45 }),
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id) || null;
export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const intensityIndex = (key) => {
  const i = INTENSITIES.findIndex((x) => x.key === key);
  return i === -1 ? 1 : i; // unknown means moderate
};
const burnFrom = (met, kg, hours) => Math.max(0, (met - 1) * kg * hours);

/**
 * Extra calories burned. `amount` holds what the exercise's kind counts:
 * { sets, reps } | { minutes, intensity } | { km } | { steps }.
 */
export function caloriesBurned(exercise, amount = {}, weightKg = DEFAULT_WEIGHT_KG) {
  if (!exercise) return 0;
  const kg = num(weightKg) || DEFAULT_WEIGHT_KG;
  let kcal = 0;
  if (exercise.kind === "reps") {
    const sets = Math.max(1, Math.round(num(amount.sets)) || 1);
    const total = sets * Math.round(num(amount.reps));
    const activeHours = (total * exercise.secPerRep) / 3600;
    const restHours = ((sets - 1) * REST_SEC) / 3600;
    kcal = total ? burnFrom(exercise.met, kg, activeHours) + burnFrom(REST_MET, kg, restHours) : 0;
  } else if (exercise.kind === "time") {
    const met = exercise.met[intensityIndex(amount.intensity || "moderate")] ?? exercise.met[1];
    kcal = burnFrom(met, kg, num(amount.minutes) / 60);
  } else if (exercise.kind === "distance") {
    kcal = burnFrom(exercise.met, kg, num(amount.km) / exercise.kmh);
  } else if (exercise.kind === "steps") {
    kcal = burnFrom(exercise.met, kg, num(amount.steps) / STEPS_PER_MIN / 60);
  }
  return Math.round(kcal);
}

/** "3 × 12", "30 min · moderate", "5 km", "6,000 steps". */
export function describeAmount(exercise, amount = {}) {
  if (!exercise) return "";
  if (exercise.kind === "reps") return `${amount.sets || 1} × ${amount.reps}`;
  if (exercise.kind === "time") {
    const level = INTENSITIES.find((i) => i.key === amount.intensity)?.label.toLowerCase();
    return `${amount.minutes} min${level && level !== "moderate" ? ` · ${level}` : ""}`;
  }
  if (exercise.kind === "distance") return `${amount.km} km`;
  if (exercise.kind === "steps") return `${Number(amount.steps).toLocaleString("en-IN")} steps`;
  return "";
}

// A few easy ways to burn about `kcal`: brisk walking, jogging, cycling, skipping, Surya Namaskar.
const BALANCERS = [
  { id: "walk", intensity: "moderate" },
  { id: "run", intensity: "moderate" },
  { id: "cycle", intensity: "moderate" },
  { id: "skipping", intensity: "moderate" },
  { id: "surya", intensity: "moderate" },
];

/** [{ exercise, minutes, intensity, kcal }]: minutes rounded to 5, at least 5, at most 3 hours. */
export function waysToBurn(kcal, weightKg = DEFAULT_WEIGHT_KG, count = 3) {
  const target = num(kcal);
  if (!target) return [];
  return BALANCERS.map(({ id, intensity }) => {
    const exercise = exerciseById(id);
    const perMinute = caloriesBurned(exercise, { minutes: 60, intensity }, weightKg) / 60;
    const minutes = Math.min(180, Math.max(5, Math.round(target / perMinute / 5) * 5));
    return { exercise, minutes, intensity, kcal: caloriesBurned(exercise, { minutes, intensity }, weightKg) };
  }).slice(0, count);
}

/** Total burned from logged entries. */
export const totalBurned = (entries) => entries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
