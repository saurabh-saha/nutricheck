import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { cleanDishLabel } from "./units"
import { makeThumbnail } from "./thumbnail"
import { trackFoodAdded } from "./track";

const db = getFirestore();
const auth = getAuth();

export function getDefaultIntake() {
  return {
    calories: 2000,
    protein: 50,
    fat: 70,
    carbs: 260,
    fiber: 30
  };
}

export const CHART_DAYS = 7;

export const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

// Sensible default meal slot for the current time of day.
export function defaultMealForNow(date = new Date()) {
  const h = date.getHours();
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 15 && h < 18) return "snack";
  return "dinner";
}

export const mealOrder = (meal) => {
  const i = MEALS.findIndex(m => m.key === meal);
  return i === -1 ? MEALS.length : i;
};

export function getTodayDate() {
  return formatDate(new Date());
}

export function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Entry storage
// - Logged in: Firestore users/{uid}/intakeHistory is the source of truth.
// - Guest: entries live in localStorage on this device (GUEST_KEY) and are
//   copied to Firestore (same ids, so it's safe to retry) on the next login.
// ---------------------------------------------------------------------------
const GUEST_KEY = 'nutricheck-guest-entries';

const readGuestEntries = () => {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(list) ? list.filter(e => e && e.id) : [];
  } catch {
    return [];
  }
};
const writeGuestEntries = (list) => localStorage.setItem(GUEST_KEY, JSON.stringify(list));

export const hasGuestEntries = () => readGuestEntries().length > 0;

async function fetchFirestoreEntries(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "intakeHistory"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

let migration = null;
// Copy guest entries into the logged-in account, then clear them locally.
export function migrateGuestEntries(uid) {
  if (!migration) {
    migration = (async () => {
      const guest = readGuestEntries();
      for (const { id, ...data } of guest) {
        await setDoc(doc(db, "users", uid, "intakeHistory", id), data);
      }
      if (guest.length) {
        // Keep anything added while we were copying.
        const copied = new Set(guest.map(e => e.id));
        writeGuestEntries(readGuestEntries().filter(e => !copied.has(e.id)));
      }
      return guest.length;
    })().finally(() => { migration = null; });
  }
  return migration;
}

export async function getTrackerHistory() {
  try {
    const user = auth.currentUser;
    if (!user) return readGuestEntries();

    try {
      await migrateGuestEntries(user.uid);
    } catch (err) {
      console.error("Couldn't move guest entries to your account:", err);
    }
    return await fetchFirestoreEntries(user.uid);
  } catch (err) {
    console.error("Error loading tracker history:", err);
    return [];
  }
}

// Newest first: by date, then by when it was logged.
export const byNewest = (a, b) =>
  (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0);

// All entries (account or guest), newest date first.
export async function getAllEntries() {
  const user = auth.currentUser;
  if (!user) return readGuestEntries().sort(byNewest);
  await migrateGuestEntries(user.uid).catch(err => console.error(err));
  return (await fetchFirestoreEntries(user.uid)).sort(byNewest);
}

// Save one entry. `dish` is the full label, e.g. "1 bowl of dal".
export async function logEntry({ dish, nutrition, date, meal, imageUrl = null, extras = {} }) {
  const entry = {
    ...extras, // per100g / unitGrams / defaultUnit: lets recents be rescaled later
    date: date || getTodayDate(),
    dish,
    meal: meal || defaultMealForNow(),
    nutrition,
    imageUrl,
    createdAt: Date.now(),
  };
  const user = auth.currentUser;
  if (user) {
    const ref = await addDoc(collection(db, "users", user.uid, "intakeHistory"), entry);
    return { id: ref.id, ...entry };
  }
  const saved = { id: crypto.randomUUID(), ...entry };
  writeGuestEntries([...readGuestEntries(), saved]);
  return saved;
}

export async function updateEntry(id, { date, dish, nutrition, meal }) {
  const changes = { date, dish, nutrition, ...(meal ? { meal } : {}) };
  const user = auth.currentUser;
  if (user) {
    await updateDoc(doc(db, "users", user.uid, "intakeHistory", id), changes);
    return;
  }
  writeGuestEntries(readGuestEntries().map(e => (e.id === id ? { ...e, ...changes } : e)));
}

export async function deleteEntry(id) {
  const user = auth.currentUser;
  if (user) {
    await deleteDoc(doc(db, "users", user.uid, "intakeHistory", id));
    return;
  }
  writeGuestEntries(readGuestEntries().filter(e => e.id !== id));
}

// Distinct dishes logged most recently (for one-tap re-logging).
export function getRecentDishes(entries, limit = 8) {
  const seen = new Set();
  const recent = [];
  for (const e of [...entries].sort(byNewest)) {
    const key = (e.dish || "").trim().toLowerCase();
    if (!key || seen.has(key) || !e.nutrition) continue;
    seen.add(key);
    recent.push({ dish: e.dish, nutrition: e.nutrition, imageUrl: e.imageUrl || null, image: e.image, per100g: e.per100g, unitGrams: e.unitGrams, defaultUnit: e.defaultUnit });
    if (recent.length >= limit) break;
  }
  return recent;
}

export const nutrientMap = [
  { key: "calories", label: "Calories", unit: "kcal", color: "#FF6B6B" },   // Coral Red
  { key: "protein", label: "Protein", unit: "g", color: "#FF6B6B" },        // Aqua Blue
  { key: "fat", label: "Fat", unit: "g", color: "#FF6B6B" },                 // Gold Yellow
  { key: "carbs", label: "Carbs", unit: "g", color: "#FF6B6B" },             // Fresh Green
  { key: "vitamins", label: "Vitamins", unit: "g", color: "#FF6B6B" },        // Soft Purple
  { key: "minerals", label: "Minerals", unit: "g", color: "#FF6B6B" },       // Slate Blue
  { key: "fiber", label: "Fiber", unit: "g", color: "#FF6B6B" },             // Soft Orange
];


export function getHistoricalSummary(history) {
  const daysMap = {};

  // Group history by date
  history.forEach(e => {
    if (!daysMap[e.date]) daysMap[e.date] = [];
    daysMap[e.date].push(e);
  });

  // Generate last N dates from today backwards
  const today = new Date();
  const lastNDates = [];
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d)
    lastNDates.push(dateStr);
  }

  // Build summary for each day (empty if no entries)
  return lastNDates
    .reverse() // so oldest comes first
    .map(date => ({
      date,
      ...computeSummary(daysMap[date] || [])
    }));
}

export const computeSummary = (entries) => {
  const sum = {};

  // Initialize all nutrients from nutrientMap
  nutrientMap.forEach(({ key }) => {
    sum[key] = 0;
  });
  entries.forEach(e => {
    for (let key in sum) {
      let value = e.nutrition[key]

      if (typeof value === 'string') {
        // Strip non-numeric characters (like "g", "%", etc.)
        value = parseFloat(value.replace(/[^\d.-]/g, ''))
      }

      if (!isNaN(value)) {
        sum[key] += value
      }
    }
  })

  return sum
}

function normalizeNutritionPerUnit(quantity, nutrition) {
  if (!quantity || quantity === 0) return nutrition;

  const normalized = {};
  for (const key in nutrition) {
    if (typeof nutrition[key] === "number") {
      normalized[key] = nutrition[key] / quantity;
    } else {
      normalized[key] = nutrition[key];
    }
  }
  return normalized;
}

export async function addRecipeWithNormalizedNutrition(dish, quantity, unit, nutrition, imageUrl = null) {
  const nutritionPerUnit = normalizeNutritionPerUnit(quantity, nutrition);

  await addDoc(collection(db, "recipes"), {
    name: dish.trim(),
    nutritionPerUnit,
    unit,
    imageUrl,
    createdAt: new Date(),
  });
}

export async function handleAddEntry({
  dish, quantity, unit, photos = [], thumb = null, extras = {}, nutrition, selectedDate, meal, setHistory, setTodayData, onSuccess, onError
}) {
  if (!dish.trim() || !nutrition) return;

  // Names from the AI are dish names only; strip any amount it added anyway.
  const name = dish.replace(/^\d+(?:\.\d+)?\s+\S+\s+of\s+/i, "").trim() || dish.trim();
  const fullDish = cleanDishLabel(`${quantity} ${unit} of ${name}`);

  let imageUrl = null;
  try {
    // Small private thumbnail stored with the entry (no third-party upload).
    imageUrl = photos[0] ? await makeThumbnail(photos[0]) : thumb;
    await logEntry({ dish: fullDish, nutrition, date: selectedDate, meal, imageUrl, extras });
    await refreshTrackerState({ setHistory, setTodayData });
    trackFoodAdded({ meal, via: photos[0] ? "photo" : "search", for_today: selectedDate === getTodayDate(), signed_in: Boolean(auth.currentUser) });
    onSuccess?.();
  } catch (err) {
    console.error("Error adding entry:", err);
    onError?.();
    return;
  }

  // Shared recipe catalogue; best effort, never blocks logging.
  if (auth.currentUser) {
    addRecipeWithNormalizedNutrition(name, quantity, unit, nutrition, null)
      .catch(err => console.warn("Couldn't save recipe:", err));
  }
}

// Re-log a recent/favourite item in one tap.
export async function quickAddEntry({ item, date, meal, setHistory, setTodayData }) {
  await logEntry({ dish: cleanDishLabel(item.dish), nutrition: item.nutrition, date, meal, imageUrl: item.imageUrl || null });
  trackFoodAdded({ meal, via: "quick_add", for_today: date === getTodayDate(), signed_in: Boolean(auth.currentUser) });
  await refreshTrackerState({ setHistory, setTodayData });
}

export async function refreshTrackerState({ setHistory, setTodayData }) {
  const all = await getTrackerHistory();
  setHistory?.(all);
  setTodayData?.(computeSummary(all.filter(e => e.date === getTodayDate())));
  return all;
}

// Days in a row with something logged, ending today (or yesterday, if today is still empty).
export function streakOf(history) {
  const days = new Set(history.map((e) => e.date))
  const d = new Date()
  if (!days.has(formatDate(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(formatDate(d))) { n += 1; d.setDate(d.getDate() - 1) }
  return n
}
