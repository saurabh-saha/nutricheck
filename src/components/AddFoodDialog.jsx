import { useRef, useState } from "react"
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
  const [dish, setDish] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState("bowl")
  const [isLoading, setIsLoading] = useState(false)

  const closeRef = useRef(null)

  const handleAdd = async () => {
    await handleAddEntry({
      dish,
      quantity,
      unit,
      setLoading: setIsLoading,
      setHistory,
      setTodayData,
      onSuccess: () => {
        // Reset local state
        setDish("")
        setQuantity(1)
        setUnit("bowl")

        // Close dialog
        closeRef.current?.click()

        // Optional: show a toast
        toast({
            title: "✅ Dish added successfully",
            description: "Your food entry has been logged.",
        })
      },
      onError: () => {
        toast({
            title: "❌ Failed to fetch nutrition info",
            variant: "destructive",
        })
      }
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-blue-500 text-white px-4 py-2 rounded shadow">
          ➕ Add for Today
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Food for Today</DialogTitle>
        </DialogHeader>

        <DishInput
          dish={dish}
          setDish={setDish}
          quantity={quantity}
          setQuantity={setQuantity}
          unit={unit}
          setUnit={setUnit}
          handleGenerate={handleAdd}
          isLoading={isLoading}
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
