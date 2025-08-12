// RecipesContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllRecipes } from "../utils/nutritionTracker";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebaseConfig";

const RecipesContext = createContext();

export function RecipesProvider({ children }) {
  const [recipesCache, setRecipesCache] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAllRecipes(user.uid).then(setRecipesCache);
      } else {
        setRecipesCache([]);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <RecipesContext.Provider value={recipesCache}>
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipesCache() {
  return useContext(RecipesContext);
}
