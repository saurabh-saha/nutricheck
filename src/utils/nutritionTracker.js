import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
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
    let firebaseData = [];
    let localData = [];

    // 1. Get localStorage data
    const rawLocal = localStorage.getItem(KEY);
    if (rawLocal) {
      try {
        localData = JSON.parse(rawLocal).map(
          e => ({
            id: e.id || uuidv4(), // ensure local entries have ids
            ...e
          })
        );
      } catch (e) {
        console.warn("Invalid localStorage data, resetting...");
        localData = [];
      }
    }

    // 2. If logged in, get Firebase data
    if (user) {
      const querySnapshot = await getDocs(collection(db, "users", user.uid, "intakeHistory"));
      firebaseData = querySnapshot.docs.map(
        doc => ({
          id: doc.id,
          ...doc.data()
        })
      );

      // 3. Find entries in localData that aren't in Firebase
      const firebaseSet = new Set(firebaseData.map(e => `${e.date}-${e.dish}`));
      const newForFirebase = localData.filter(e => !firebaseSet.has(`${e.date}-${e.dish}`));

      // 4. Push missing local entries to Firebase
      for (const entry of newForFirebase) {
        const ref = doc(db, "users", user.uid, "intakeHistory", entry.id);
        await setDoc(ref, entry);
      }
      
      // 5. Merge all data (Firebase + local, avoiding duplicates)
      const mergedSet = new Map();
      [...firebaseData, ...localData].forEach(e => {
        mergedSet.set(`${e.date}-${e.dish}`, e);
      });
      const mergedArray = Array.from(mergedSet.values());

      // 6. Update localStorage with merged data
      localStorage.setItem(KEY, JSON.stringify(mergedArray));

      return mergedArray;
    }

    // 7. If not logged in, just return local data
    return localData;
  } catch (err) {
    console.error("Error syncing tracker history:", err);
    return [];
  }
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


export function getLast7DaysSummary(history) {
  const daysMap = {};

  // Group history by date
  history.forEach(e => {
    if (!daysMap[e.date]) daysMap[e.date] = [];
    daysMap[e.date].push(e);
  });

  // Generate last 7 dates from today backwards
  const today = new Date();
  const last7Dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d)
    last7Dates.push(dateStr);
  }

  // Build summary for each day (empty if no entries)
  return last7Dates
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
  dish, quantity, unit, dishImage, nutrition, setHistory, setTodayData, onSuccess, onError 
}) {
  if (!dish.trim() || !nutrition) return;

  const fullDish = `${quantity} ${unit} of ${dish}`;

  try {
    const imageUrl = await uploadDishImage(dishImage, dish);
    const newEntry = { 
      date: getTodayDate(), 
      dish: fullDish, 
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


  
  