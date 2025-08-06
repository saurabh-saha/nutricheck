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
  
  export function calculatePersonalizedIntake(profile) {
    const { age, sex, height, weight, activityLevel, goal } = profile;
  
    if (!age || !height || !weight) return null;
  
    // Mifflin–St Jeor BMR calculation
    let bmr;
    if (sex === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
  
    // Adjust for activity level
    let calories = bmr * activityLevel;
  
    // Adjust for goal
    if (goal === "lose") calories -= 500;
    if (goal === "gain") calories += 500;
  
    // Macros split: 20% protein, 30% fat, 50% carbs
    const protein = Math.round((calories * 0.2) / 4);
    const fat = Math.round((calories * 0.3) / 9);
    const carbs = Math.round((calories * 0.5) / 4);
  
    return {
      calories: Math.round(calories),
      protein,
      fat,
      carbs,
      vitamins: 100,
      minerals: 100
    };
  }
  