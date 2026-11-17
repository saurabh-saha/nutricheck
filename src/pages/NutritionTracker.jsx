import { useState, useEffect, useMemo } from 'react'
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Plus } from 'lucide-react'
import Layout from '../components/Layout'
import { refreshTrackerState, hasGuestEntries, getTodayDate, computeSummary, getDefaultIntake, defaultMealForNow } from '../utils/nutritionTracker.js'
import { toast } from "../hooks/use-toast"
import GuestBanner from "../components/GuestBanner"
import AddFoodDialog from '../components/AddFoodDialog'
import DateChip from '../components/DateChip'
import MissesCard from '../components/MissesCard'
import MealsCard from '../components/MealsCard'
import WeekChart from '../components/WeekChart'
import Onboarding, { ONBOARDING_DONE_KEY } from "../components/Onboarding"
import { useIntake } from "../context/ProfileContext"
import { loadProfileFromFirestore } from "../utils/firebaseLogin"

// First visit with no profile anywhere -> show onboarding.
async function needsOnboarding(user) {
  if (localStorage.getItem(ONBOARDING_DONE_KEY) || localStorage.getItem("userProfile")) return false;
  if (user) {
    const data = await loadProfileFromFirestore().catch(() => null);
    if (data?.profile) {
      localStorage.setItem("userProfile", JSON.stringify(data.profile));
      return false;
    }
  }
  return true;
}

const MACROS = [
  { key: "protein", label: "Protein", bar: "bg-emerald-500" },
  { key: "carbs", label: "Carbs", bar: "bg-amber-400" },
  { key: "fat", label: "Fat", bar: "bg-rose-400" },
  { key: "fiber", label: "Fiber", bar: "bg-lime-500" },
]

// Calories left (big), then the four macros against their goals.
function DaySummary({ summary, intake }) {
  const eaten = Math.round(summary.calories || 0)
  const goal = Math.round(intake.calories)
  const left = goal - eaten
  const size = 104, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = goal ? Math.min(eaten / goal, 1) : 0
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-gray-50 p-4 dark:bg-gray-800/70">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${eaten} of ${goal} kcal`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={left < 0 ? "#f43f5e" : "#3b82f6"}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
        <text x="50%" y="47%" textAnchor="middle" className="fill-current text-xl font-bold">{Math.abs(left).toLocaleString()}</text>
        <text x="50%" y="64%" textAnchor="middle" className="fill-gray-500 text-[10px]">{left < 0 ? "kcal over" : "kcal left"}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm"><b>{eaten.toLocaleString()}</b> <span className="text-gray-500 dark:text-gray-400">/ {goal.toLocaleString()} kcal</span></p>
        {MACROS.map((m) => {
          const v = Math.round(summary[m.key] || 0), g = Math.round(intake[m.key] || 0)
          return (
            <div key={m.key}>
              <div className="flex justify-between text-xs"><span>{m.label}</span><span className="text-gray-500 dark:text-gray-400">{v} / {g} g</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className={`h-full rounded-full ${m.bar} transition-all`} style={{ width: `${g ? Math.min(100, (v / g) * 100) : 0}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function NutritionTracker() {
  const [user, authLoading] = useAuthState(auth);
  const [history, setHistory] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addMeal, setAddMeal] = useState(defaultMealForNow)
  const [prefill, setPrefill] = useState(null)
  const { recommendedIntake } = useIntake()
  const intake = recommendedIntake || getDefaultIntake()

  useEffect(() => {
    // Works for guests (device storage) and logged-in users (Firestore).
    // On login, guest entries are moved into the account.
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const hadGuestEntries = Boolean(u) && hasGuestEntries();
      await refreshTrackerState({ setHistory });
      setLoaded(true);
      setShowOnboarding(await needsOnboarding(u));
      if (hadGuestEntries && !hasGuestEntries()) {
        toast({ title: "✅ Saved to your account", description: "Entries from this device are now backed up." });
      }
    });
    return () => unsubscribe();
  }, []);

  const dayEntries = useMemo(() => history.filter((e) => e.date === selectedDate), [history, selectedDate])
  const summary = useMemo(() => computeSummary(dayEntries), [dayEntries])
  const isToday = selectedDate === getTodayDate()

  const openAdd = (meal = defaultMealForNow(), fill = null) => {
    setAddMeal(meal)
    setPrefill(fill)
    setAddOpen(true)
  }
  // A suggested fix: open the sheet ready to add it (today, to that meal).
  const addFix = (f) => {
    setSelectedDate(getTodayDate())
    openAdd(f.meal, {
      item: { name: f.name, baseQuantity: f.quantity, baseUnit: f.unit, nutrition: f.nutrition },
      quantity: f.quantity, unit: f.unit, nonce: Date.now(),
    })
  }

  return (
    <Layout>
      <div className="space-y-4 pb-24">
        {!authLoading && !user && <GuestBanner />}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{isToday ? "Today" : new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</h1>
          <DateChip value={selectedDate} onChange={setSelectedDate} />
        </div>

        <DaySummary summary={summary} intake={intake} />

        <MissesCard history={history} loaded={loaded} intake={intake} onAddFix={addFix} />

        <MealsCard entries={dayEntries} onAdd={(meal) => openAdd(meal)} />

        <WeekChart history={history} intake={intake} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      {/* One clear way to log food, clear of the phone's bottom edge */}
      <button type="button" onClick={() => openAdd()}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-blue-600 py-3.5 pl-4 pr-5 text-base font-semibold text-white shadow-xl shadow-blue-600/30 active:scale-95 sm:right-8">
        <Plus size={20} /> Add food
      </button>

      <AddFoodDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setPrefill(null) }}
        showTrigger={false}
        date={selectedDate}
        meal={addMeal}
        onMealChange={setAddMeal}
        prefill={prefill}
        history={history}
        setHistory={setHistory}
      />
      {showOnboarding && (
        <Onboarding
          onDone={() => setShowOnboarding(false)}
          onLogFirstMeal={() => openAdd()}
        />
      )}
    </Layout>
  )
}
