export function getNutritionHistory() {
    const saved = localStorage.getItem('nutritionHistory')
    return saved ? JSON.parse(saved) : []
  }
  
  export function saveToHistory(dishName, nutrition) {
    const existing = getNutritionHistory()
    const isDuplicate = existing.some(
      (entry) => entry.dish.toLowerCase() === dishName.toLowerCase()
    )
  
    const updated = isDuplicate
      ? existing
      : [{ dish: dishName, nutrition }, ...existing].slice(0, 20)
  
    localStorage.setItem('nutritionHistory', JSON.stringify(updated))
    return updated.map((e) => e.dish)
  }
  
  export function getNutritionForDish(dishName) {
    const existing = getNutritionHistory()
    const match = existing.find(
      (entry) => entry.dish.toLowerCase() === dishName.toLowerCase()
    )
    return match?.nutrition || null
  }
  