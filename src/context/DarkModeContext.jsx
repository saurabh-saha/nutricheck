// src/context/DarkModeContext.jsx
import { createContext, useContext } from "react";
import useDarkMode from "../hooks/useDarkMode";

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  const { isDark, toggle } = useDarkMode();
  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkModeContext() {
  return useContext(DarkModeContext);
}
