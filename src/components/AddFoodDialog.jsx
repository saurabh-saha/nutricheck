import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "./ui/dialog"
import { toast } from "../hooks/use-toast"

import DishInput from "./DishInput"
import { handleAddEntry, getRecentDishes, getTodayDate, formatDate, CHART_DAYS } from "../utils/nutritionTracker"
import { getFavorites, addFavorite, removeFavorite } from "../utils/favorites"
import { cleanDishLabel } from "../utils/units"

const dayLabel = (iso) => {
  const today = getTodayDate()
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (iso === today) return "Today"
  if (iso === formatDate(y)) return "Yesterday"
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
}

// Compact date chip: shows "Today"; tapping opens the native calendar.
function DateChip({ value, onChange }) {
  const { min, max } = useMemo(() => {
    const t = new Date()
    const m = new Date(t); m.setDate(t.getDate() - (CHART_DAYS - 1))
    return { min: formatDate(m), max: formatDate(t) }
  }, [])
  return (
    <label className="relative flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
      <CalendarDays size={15} className="text-blue-600" />
      {dayLabel(value)}
      <ChevronDown size={14} className="text-gray-400" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        aria-label="Date"
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  )
}

export default function AddFoodDialog({ history = [], setHistory, setTodayData, open, onOpenChange }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [favorites, setFavorites] = useState([])
  const closeRef = useRef(null)

  const recent = useMemo(() => getRecentDishes(history), [history])

  useEffect(() => {
    getFavorites().then(setFavorites).catch(err => console.error("Couldn't load favourites:", err))
  }, [history.length])

  // Opening the sheet again starts on today.
  useEffect(() => { if (open) setSelectedDate(getTodayDate()) }, [open])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 bg-blue-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Add food for today"
        >
          ➕
        </button>
      </DialogTrigger>

      <DialogContent className="mobile-sheet w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)] gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] top-auto bottom-0 translate-y-0 rounded-t-3xl border-0 bg-gray-50 dark:bg-gray-900 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-3 pr-9">
            <DialogTitle className="text-left text-lg">Add food</DialogTitle>
            <DateChip value={selectedDate} onChange={setSelectedDate} />
          </div>
        </DialogHeader>

        <DishInput
            tracking
            selectedDate={selectedDate}
            quickAdd={{ favorites, recent, onToggleFavorite: handleToggleFavorite }}
            onSelect={(dish, quantity, unit, nutrition, photos, date, meal, thumb) => {
                handleAddEntry({
                  dish, quantity, unit, photos, thumb, nutrition, meal,
                  selectedDate: date,
                  setHistory,
                  setTodayData,
                  onSuccess: () => toast({ title: "✅ Added", description: cleanDishLabel(`${quantity} ${unit} of ${dish}`) }),
                  onError: () => toast({ title: "Couldn't save that entry", variant: "destructive" }),
                });
            }}
            onClose={() => closeRef.current?.click()}
        />

        <DialogClose asChild>
          <button ref={closeRef} className="sr-only">Close</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
