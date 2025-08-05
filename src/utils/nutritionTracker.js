import { getNutritionFromGemini } from './gemini'
const KEY = 'nutrition-tracker-v2'

export function getTodayDate() {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}
  
export function getTrackerHistory() {
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveToTracker(entry) {
  const current = getTrackerHistory()
  const updated = [...current, entry]
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

export const nutrientMap = [
    { key: "calories", label: "Calories", unit: "kcal", color: "#8884d8" },
    { key: "protein", label: "Protein", unit: "g", color: "#82ca9d" },
    { key: "fat", label: "Fat", unit: "g", color: "#ffc658" },
    { key: "carbs", label: "Carbs", unit: "g", color: "#ff8042" },
    { key: "vitamin", label: "Vitamins", unit: "g", color: "#00bcd4" },
    { key: "minerals", label: "Minerals", unit: "g", color: "#4caf50" },
    { key: "fiber", label: "Fiber", unit: "g", color: "#a1887f" },
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
    const sum = {
      calories: 0, protein: 0, fat: 0, carbs: 0,
      vitamins: 0, minerals: 0
    }
  
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

export const recommendedIntake = {
    calories: 2200,
    protein: 50,
    fat: 70,
    carbs: 300,
    vitamins: 100,
    minerals: 100
  }


export async function handleAddEntry({ 
    dish, quantity, unit, nutrition, setHistory, setTodayData, onSuccess, onError 
}) {
    if (!dish.trim() || !nutrition) return;
  
    const fullDish = `${quantity} ${unit} of ${dish}`;
    const newEntry = { date: getTodayDate(), dish: fullDish, nutrition };
    const updated = saveToTracker(newEntry);
  
    setHistory(updated);
    const today = updated.filter(e => e.date === getTodayDate());
    setTodayData(computeSummary(today));
  
    onSuccess?.();
}
  
  