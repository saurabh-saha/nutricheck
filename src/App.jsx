// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import CalorieFinder from './pages/CalorieFinder'
import NutritionTracker from './pages/NutritionTracker'
import { Toaster } from "./components/ui/toaster"
import Profile from './pages/Profile'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<CalorieFinder />} />
        <Route path="/track" element={<NutritionTracker />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <Toaster />
    </>
  )
}