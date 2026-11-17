import { useState, useEffect, useMemo, useRef } from 'react'
import { getNutritionHistory, saveToHistory } from '../utils/nutritionHistory'
import Layout from '../components/Layout'
import { cleanDishLabel } from '../utils/units'
import { handleAddEntry, getTodayDate } from '../utils/nutritionTracker'
import { toast } from '../hooks/use-toast'
import { landingSearchFrom } from '../utils/landingSearch'
import DishInput from '../components/DishInput'
import NutritionResult from '../components/NutritionResult'
import PreviousSearches from '../components/PreviousSearches'
import { Soup } from 'lucide-react'
import { analyticsPromise } from "../utils/firebaseConfig";
import { logEvent } from "firebase/analytics";

export default function CalorieFinder() {
  const [result, setResult] = useState(null)
  const [added, setAdded] = useState(null) // meal the dish was just added to
  const resultRef = useRef(null)
  const [previousSearches, setPreviousSearches] = useState([])
  // ?q=... from a campaign link, otherwise the built-in eggs example.
  const landing = useMemo(() => landingSearchFrom(window.location.search), [])

  useEffect(() => {
    analyticsPromise.then((analytics) => {
      if (analytics) {
        logEvent(analytics, "page_view", {
          page_title: "CalorieFinder",
          page_path: "/",
        });
        console.log("[GA] Fired page_view");
        if (!landing.example) {
          logEvent(analytics, "landing_search", { search_term: landing.dish, quantity: landing.quantity, unit: landing.unit });
        }
      } else {
        console.warn("[GA skipped] Analytics not supported");
      }
    });

    const entries = getNutritionHistory()
    setPreviousSearches(entries.map((e) => e.dish))
  
  }, [])

  const scrollToResult = () =>
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)

  // Picking a dish (or changing its amount) shows its breakdown.
  const handlePreview = (p) => {
    if (!p) return
    setResult(p.nutrition)
    setAdded(null)
    scrollToResult()
  }

  // "Add to dinner · 310 kcal": log it for today, straight from the home page.
  const handleAddFromHome = (dish, quantity, unit, nutrition, photos, _date, meal, thumb, extras) => {
    const label = cleanDishLabel(`${quantity} ${unit} of ${dish}`)
    setResult(nutrition)
    setPreviousSearches(saveToHistory(label, nutrition))
    handleAddEntry({
      dish, quantity, unit, nutrition, photos, thumb, extras, meal,
      onSuccess: () => {
        setAdded(meal)
        toast({ title: '✅ Added to today', description: label })
        scrollToResult()
      },
      onError: () => toast({ title: "Couldn't add that", description: 'Please try again.', variant: 'destructive' }),
    })
  }

  return (
    <Layout>
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Soup size={22} />
        <span>Find What’s on Your Plate</span>
      </h1>

      <DishInput
        tracking
        selectedDate={getTodayDate()}
        initial={landing}
        onPreview={handlePreview}
        onSelect={handleAddFromHome}
        onClose={() => {}}
      />

      <div ref={resultRef}>
        <NutritionResult result={result} added={added} />
      </div>

      <PreviousSearches
        searches={previousSearches}
        onClick={(dishName) => {
          const entries = getNutritionHistory();
          const found = entries.find(e => e.dish === dishName);
          if (found) { setResult(found.nutrition); setAdded(null); scrollToResult() }
        }}
      />
    </Layout>
  )
}
