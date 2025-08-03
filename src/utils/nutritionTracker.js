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
