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
import { handleAddEntry, quickAddEntry, getRecentDishes, getTodayDate } from "../utils/nutritionTracker"
import { getFavorites, addFavorite, removeFavorite } from "../utils/favorites"
import { cleanDishLabel } from "../utils/units"

export default function AddFoodDialog({ history = [], setHistory, setTodayData, open, onOpenChange }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [favorites, setFavorites] = useState([])
  const [busy, setBusy] = useState(false)
  const closeRef = useRef(null)

  const recent = useMemo(() => getRecentDishes(history), [history])

  useEffect(() => {
    getFavorites().then(setFavorites).catch(err => console.error("Couldn't load favourites:", err))
  }, [history.length])

  const handleQuickAdd = async (item, date, meal) => {
    setBusy(true)
    try {
      await quickAddEntry({ item, date, meal, setHistory, setTodayData })
      toast({ title: "✅ Logged", description: cleanDishLabel(item.dish) })
      closeRef.current?.click()
    } catch (err) {
      console.error("Quick add failed:", err)
      toast({ title: "❌ Couldn't log that", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleToggleFavorite = async (item, isFavorite) => {
    try {
      if (isFavorite) await removeFavorite(item.dish)
      else await addFavorite({ ...item, dish: cleanDishLabel(item.dish) })
      setFavorites(await getFavorites())
    } catch (err) {
      console.error("Favourite update failed:", err)
      toast({ title: "❌ Couldn't update favourites", variant: "destructive" })
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
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-gray-300 sm:hidden" aria-hidden />
          <DialogTitle className="text-left text-lg">Add food</DialogTitle>
        </DialogHeader>

        <DishInput
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            quickAdd={{ favorites, recent, busy, onAdd: handleQuickAdd, onToggleFavorite: handleToggleFavorite }}
            onSelect={(dish, quantity, unit, nutrition, dishImage, date, meal) => {
                handleAddEntry({
                dish,
                quantity,
                unit,
                dishImage,
                nutrition,
                selectedDate: date,
                meal,
                setHistory,
                setTodayData,
                onSuccess: () => {
                    toast({
                    title: "✅ Dish added successfully",
                    description: "Your food entry has been logged.",
                    });
                },
                onError: () => {
                    toast({
                    title: "❌ Couldn't save that entry",
                    variant: "destructive",
                    });
                }
                });
            }}
            onClose={() => closeRef.current?.click()} // animate + close modal
        />

        <DialogClose asChild>
          <button
            ref={closeRef}
            className="py-2 text-sm text-gray-500 underline"
          >
            Cancel
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
