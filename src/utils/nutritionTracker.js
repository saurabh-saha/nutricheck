import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { uploadDishImage } from "../utils/firebaseLogin"

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

const KEY = 'nutrition-tracker-v2'
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

export async function getTrackerHistory() {
  try {
    const user = auth.currentUser;
    let localData = [];

    // 1. Get localStorage data
    const rawLocal = localStorage.getItem(KEY);
    if (rawLocal) {
      try {
        localData = JSON.parse(rawLocal).map(
          e => ({
            id: e.id || crypto.randomUUID(), // ensure local entries have ids
            ...e
          })
        );
      } catch {
        console.warn("Invalid localStorage data, resetting...");
        localData = [];
      }
    }

    // 2. If logged in, Firestore is the source of truth (entries can be
    //    edited/deleted from the History page, so a stale local copy must
    //    never be merged back in).
    if (user) {
      const firebaseData = await fetchFirestoreEntries(user.uid);
      localStorage.setItem(KEY, JSON.stringify(firebaseData));
      return firebaseData;
    }

    // 7. If not logged in, just return local data
    return localData;
  } catch (err) {
    console.error("Error syncing tracker history:", err);
    return [];
  }
}

async function fetchFirestoreEntries(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "intakeHistory"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- History page: list / edit / delete individual entries ----

const entryRef = (id) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return doc(db, "users", user.uid, "intakeHistory", id);
};

const refreshLocalCache = async () => {
  const user = auth.currentUser;
  if (!user) return [];
  const all = await fetchFirestoreEntries(user.uid);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
};

// All entries for the logged-in user, newest date first.
export async function getAllEntries() {
  const all = await refreshLocalCache();
  return all.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export async function updateEntry(id, { date, dish, nutrition, meal }) {
  await updateDoc(entryRef(id), { date, dish, nutrition, ...(meal ? { meal } : {}) });
  await refreshLocalCache();
}

export async function deleteEntry(id) {
  await deleteDoc(entryRef(id));
  await refreshLocalCache();
}

export async function saveToTracker(entry) {
  const current = await getTrackerHistory(); // wait for array
  const updated = [...current, entry];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
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

export async function addRecipeWithNormalizedNutrition(dish, quantity, unit, nutrition, dishImageFile) {
  const nutritionPerUnit = normalizeNutritionPerUnit(quantity, nutrition);

  let imageUrl = null;
  if (dishImageFile) {
    imageUrl = await uploadDishImage(dishImageFile, dish);
  }

  await addDoc(collection(db, "recipes"), {
    name: dish.trim(),
    nutritionPerUnit,
    unit,
    imageUrl,
    createdAt: new Date(),
  });
}

export async function handleAddEntry({
  dish, quantity, unit, dishImage, nutrition, selectedDate, meal, setHistory, setTodayData, onSuccess, onError
}) {
  if (!dish.trim() || !nutrition) return;

  const fullDish = `${quantity} ${unit} of ${dish}`;

  try {
    const entryDate = selectedDate || getTodayDate();
    const imageUrl = await uploadDishImage(dishImage, dish);
    const newEntry = {
      date: entryDate,
      dish: fullDish,
      meal: meal || defaultMealForNow(),
      nutrition,
      imageUrl
    };

    // 1. Save locally (and await because it reads Firebase first)
    const updated = await saveToTracker(newEntry);
    setHistory(updated);

    // 2. Update today's summary
    const today = updated.filter(e => e.date === getTodayDate());
    setTodayData(computeSummary(today));

    // 3. Save to Firestore
    const user = auth.currentUser;
    if (user) {
      await addDoc(collection(db, "users", user.uid, "intakeHistory"), newEntry);
    }

    await addRecipeWithNormalizedNutrition(dish, quantity, unit, nutrition, imageUrl)
    onSuccess?.();
  } catch (err) {
    console.error("Error adding entry:", err);
    onError?.();
  }
}



