import { useState, useEffect, useMemo, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import Layout from '../components/Layout'
import { cleanDishLabel } from '../utils/units'
import { handleAddEntry, getTodayDate, getRecentDishes, refreshTrackerState, computeSummary, getDefaultIntake, streakOf } from '../utils/nutritionTracker'
import { getFavorites, addFavorite, removeFavorite } from '../utils/favorites'
import { useIntake } from '../context/ProfileContext'
import { toast } from '../hooks/use-toast'
import { landingSearchFrom } from '../utils/landingSearch'
import DishInput from '../components/DishInput'
import DateChip from '../components/DateChip'
import DayCard from '../components/DayCard'
import NutritionResult from '../components/NutritionResult'
import { auth, analyticsPromise } from "../utils/firebaseConfig";
import { logEvent } from "firebase/analytics";

// Home: "What did you eat?" first, then how the day is going.
export default function CalorieFinder() {
  const [result, setResult] = useState(null)
  const [added, setAdded] = useState(null) // meal the dish was just added to
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [history, setHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const resultRef = useRef(null)
  const { recommendedIntake } = useIntake()
  const intake = recommendedIntake || getDefaultIntake()
  // ?q=... from a campaign link searches straight away; otherwise start empty.
  const landing = useMemo(() => landingSearchFrom(window.location.search), [])

  useEffect(() => {
    analyticsPromise.then((analytics) => {
      if (!analytics) return
      logEvent(analytics, "page_view", { page_title: "CalorieFinder", page_path: "/" })
      if (landing) logEvent(analytics, "landing_search", { search_term: landing.dish, quantity: landing.quantity, unit: landing.unit })
    })
    // Guests read from this device; signed-in users from their account.
    const unsubscribe = onAuthStateChanged(auth, () => {
      refreshTrackerState({ setHistory }).catch((err) => console.error("Couldn't load your log:", err))
      getFavorites().then(setFavorites).catch(() => {})
    })
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const recent = useMemo(() => getRecentDishes(history), [history])
  const dayEntries = useMemo(() => history.filter((e) => e.date === selectedDate), [history, selectedDate])
  const daySummary = useMemo(() => computeSummary(dayEntries), [dayEntries])
  const streak = useMemo(() => streakOf(history), [history])

  const scrollToResult = () =>
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)

  // Picking a dish (or changing its amount) shows its breakdown.
  const handlePreview = (p) => {
    if (!p) return
    setResult(p.nutrition)
    setAdded(null)
    scrollToResult()
  }

  const handleToggleFavorite = async (item, isFavorite) => {
    try {
      if (isFavorite) await removeFavorite(item.dish)
      else await addFavorite({ ...item, dish: cleanDishLabel(item.dish) })
      setFavorites(await getFavorites())
    } catch (err) {
      console.error("Favourite update failed:", err)
      toast({ title: "Couldn't update favourites", variant: "destructive" })
    }
  }

  // "Add to dinner · 310 kcal": log it for the chosen day, straight from the home page.
  const handleAddFromHome = (dish, quantity, unit, nutrition, photos, date, meal, thumb, extras) => {
    const label = cleanDishLabel(`${quantity} ${unit} of ${dish}`)
    setResult(nutrition)
    handleAddEntry({
      dish, quantity, unit, nutrition, photos, thumb, extras, meal,
      selectedDate: date,
      setHistory,
      onSuccess: () => {
        setAdded(meal)
        toast({ title: date === getTodayDate() ? '✅ Added to today' : '✅ Added', description: label })
        scrollToResult()
      },
      onError: () => toast({ title: "Couldn't add that", description: 'Please try again.', variant: 'destructive' }),
    })
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">What did you eat?</h1>
        <DateChip value={selectedDate} onChange={setSelectedDate} />
      </div>

      <DishInput
        tracking
        compact
        selectedDate={selectedDate}
        quickAdd={{ favorites, recent, onToggleFavorite: handleToggleFavorite }}
        initial={landing}
        onPreview={handlePreview}
        onSelect={handleAddFromHome}
        onClose={() => {}}
      />

      <div ref={resultRef}>
        <NutritionResult result={result} added={added} />
      </div>

      <DayCard
        date={selectedDate}
        entries={dayEntries}
        summary={daySummary}
        intake={intake}
        hasGoal={Boolean(recommendedIntake)}
        streak={streak}
      />
    </Layout>
  )
}
