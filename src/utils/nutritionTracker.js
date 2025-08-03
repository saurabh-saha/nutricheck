const KEY = 'nutrition-tracker-v2'

export function getTodayDate() {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
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
  ];
  