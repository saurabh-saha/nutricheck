import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
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
        localData = JSON.parse(rawLocal);
      } catch (e) {
        console.warn("Invalid localStorage data, resetting...");
        localData = [];
      }
    }

    // 2. If logged in, get Firebase data
    if (user) {
      const querySnapshot = await getDocs(collection(db, "users", user.uid, "intakeHistory"));
      firebaseData = querySnapshot.docs.map(doc => doc.data());

      // 3. Find entries in localData that aren't in Firebase
      const firebaseSet = new Set(firebaseData.map(e => `${e.date}-${e.dish}`));
      const newForFirebase = localData.filter(e => !firebaseSet.has(`${e.date}-${e.dish}`));

      // 4. Push missing local entries to Firebase
      for (const entry of newForFirebase) {
        await addDoc(collection(db, "users", user.uid, "intakeHistory"), entry);
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
    const days = {}
  
    history.forEach(e => {
      if (!days[e.date]) days[e.date] = []
      days[e.date].push(e)
    })
  
    const sorted = Object.entries(days).sort(([d1], [d2]) => d1.localeCompare(d2))
    const last7 = sorted.slice(-7)
  
    return last7.map(([date, entries]) => ({
      date,
      ...computeSummary(entries)
    }))
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

export async function handleAddEntry({ 
  dish, quantity, unit, nutrition, setHistory, setTodayData, onSuccess, onError 
}) {
  if (!dish.trim() || !nutrition) return;

  const fullDish = `${quantity} ${unit} of ${dish}`;
  const newEntry = { 
    date: getTodayDate(), 
    dish: fullDish, 
    nutrition 
  };

  try {
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

    onSuccess?.();
  } catch (err) {
    console.error("Error adding entry:", err);
    onError?.();
  }
}


  
  