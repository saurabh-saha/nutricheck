// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import CalorieFinder from './pages/CalorieFinder'
import NutritionTracker from './pages/NutritionTracker'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CalorieFinder />} />
      <Route path="/track" element={<NutritionTracker />} />
    </Routes>
  )
}
