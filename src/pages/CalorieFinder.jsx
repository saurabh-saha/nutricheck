import { useState, useEffect, useMemo, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import Layout from '../components/Layout'
import { cleanDishLabel } from '../utils/units'
import { handleAddEntry, getTodayDate, defaultMealForNow, getRecentDishes, refreshTrackerState, computeSummary, getDefaultIntake, streakOf } from '../utils/nutritionTracker'
import { getFavorites, addFavorite, removeFavorite } from '../utils/favorites'
import { useIntake } from '../context/ProfileContext'
import { toast } from '../hooks/use-toast'
import { landingSearchFrom } from '../utils/landingSearch'
import DishInput from '../components/DishInput'
import DateChip from '../components/DateChip'
import DayCard from '../components/DayCard'
import NutritionResult from '../components/NutritionResult'
import WeightNudge from '../components/WeightNudge'
import MealIdeas from '../components/MealIdeas'
import { loadProfile } from '../utils/profile'
import { auth } from "../utils/firebaseConfig";
import { track } from "../utils/track";

// Home: "What did you eat?" first, then how the day is going.
export default function CalorieFinder() {
  const [result, setResult] = useState(null)
  const [added, setAdded] = useState(null) // meal the dish was just added to
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [history, setHistory] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [profile, setProfile] = useState(null)
  const [meal, setMeal] = useState(defaultMealForNow)
  const inputRef = useRef(null)
  const resultRef = useRef(null)
  const { recommendedIntake } = useIntake()
  const intake = recommendedIntake || getDefaultIntake()
  // ?q=... from a campaign link searches straight away; otherwise start empty.
  const landing = useMemo(() => landingSearchFrom(window.location.search), [])

  useEffect(() => {
    if (landing) track("landing_search", { search_term: landing.dish, quantity: landing.quantity, unit: landing.unit })
    // Guests read from this device; signed-in users from their account.
    const unsubscribe = onAuthStateChanged(auth, () => {
      refreshTrackerState({ setHistory })
        .catch((err) => console.error("Couldn't load your log:", err))
        .finally(() => setHistoryLoaded(true))
      getFavorites().then(setFavorites).catch(() => {})
      loadProfile().then(setProfile).catch(() => {})
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

  // Tapping "Snack" on the day card: what you type next goes to snack.
  const pickMeal = (key) => {
    setMeal(key)
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Tapping a meal idea: it's ready to add, for that meal and today.
  const pickIdea = (idea) => {
    setMeal(idea.meal)
    setSelectedDate(getTodayDate())
    setPrefill({
      item: { name: idea.name, baseQuantity: idea.quantity, baseUnit: idea.unit, nutrition: idea.nutrition },
      quantity: idea.quantity, unit: idea.unit, nonce: Date.now(),
    })
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

  // A search that named several foods: each is its own entry, one toast for all.
  const handleAddMany = async (entries, date, meal) => {
    let added = 0
    for (const entry of entries) {
      await handleAddEntry({
        ...entry, photos: [], meal, selectedDate: date, setHistory,
        onSuccess: () => { added += 1 },
      })
    }
    if (!added) {
      toast({ title: "Couldn't add those", description: 'Please try again.', variant: 'destructive' })
      return
    }
    const sum = (key) => entries.reduce((t, e) => t + (Number(e.nutrition?.[key]) || 0), 0)
    setResult(Object.fromEntries(['calories', 'protein', 'carbs', 'fat', 'fiber'].map((k) => [k, sum(k)])))
    setAdded(meal)
    toast({
      title: date === getTodayDate() ? `✅ ${added} foods added to today` : `✅ ${added} foods added`,
      description: entries.map((e) => e.dish).join(', '),
    })
    scrollToResult()
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
        onSelectMany={handleAddMany}
        onClose={() => {}}
        meal={meal}
        onMealChange={setMeal}
        inputRef={inputRef}
        prefill={prefill}
      />

      <div ref={resultRef}>
        <NutritionResult result={result} added={added} />
      </div>

      {selectedDate === getTodayDate() && (
        <MealIdeas history={history} loaded={historyLoaded} intake={intake} onPick={pickIdea} />
      )}

      <DayCard
        date={selectedDate}
        entries={dayEntries}
        summary={daySummary}
        intake={intake}
        hasGoal={Boolean(recommendedIntake)}
        streak={streak}
        activeMeal={meal}
        onPickMeal={pickMeal}
      />

      <WeightNudge profile={profile} />
    </Layout>
  )
}
