import { useRef } from "react"
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
import { handleAddEntry } from "../utils/nutritionTracker"

export default function AddFoodDialog({ setHistory, setTodayData }) {
  const closeRef = useRef(null)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 bg-blue-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Add food for today"
        >
          ➕
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Food for Today</DialogTitle>
        </DialogHeader>
        
        <DishInput
            onSelect={(dish, quantity, unit, nutrition) => {
                handleAddEntry({
                dish,
                quantity,
                unit,
                nutrition,
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
                    title: "❌ Failed to fetch nutrition info",
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
            className="mt-4 text-sm text-gray-500 underline"
          >
            Cancel
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
