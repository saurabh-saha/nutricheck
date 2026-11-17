import { useEffect, useMemo, useRef, useState } from "react"
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
import DateChip from "./DateChip"
import { handleAddEntry, getRecentDishes, getTodayDate } from "../utils/nutritionTracker"
import { getFavorites, addFavorite, removeFavorite } from "../utils/favorites"
import { cleanDishLabel } from "../utils/units"

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

      <DialogContent
        // Don't auto-focus anything when the sheet opens: on iPhone that focused the
        // hidden date input and popped the calendar. (Desktop focuses the food box itself.)
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Esc closes the food dropdown first, not the whole sheet.
        onEscapeKeyDown={(e) => { if (document.querySelector('[role="combobox"][aria-expanded="true"]')) e.preventDefault() }}
        className="mobile-sheet w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)] gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] top-auto bottom-0 translate-y-0 rounded-t-3xl border-0 bg-gray-50 dark:bg-gray-900 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl sm:p-6">
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
            onSelect={(dish, quantity, unit, nutrition, photos, date, meal, thumb, extras) => {
                handleAddEntry({
                  dish, quantity, unit, photos, thumb, extras, nutrition, meal,
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
