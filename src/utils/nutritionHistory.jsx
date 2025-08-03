export function getNutritionHistory() {
    const saved = localStorage.getItem('nutritionHistory')
    return saved ? JSON.parse(saved) : []
  }
  
  export function saveToHistory(dishName, nutrition) {
    const existing = getNutritionHistory();
  
    // Remove old entry if it exists (case-insensitive match)
    const filtered = existing.filter(
      (entry) => entry.dish.toLowerCase() !== dishName.toLowerCase()
    );
  
    // Add updated entry to the top and keep only 20
    const updated = [{ dish: dishName, nutrition }, ...filtered].slice(0, 20);
  
    localStorage.setItem('nutritionHistory', JSON.stringify(updated));
    return updated.map((e) => e.dish);
  }
  
  
  export function getNutritionForDish(dishName) {
    const existing = getNutritionHistory()
    const match = existing.find(
      (entry) => entry.dish.toLowerCase() === dishName.toLowerCase()
    )
    return match?.nutrition || null
  }
  