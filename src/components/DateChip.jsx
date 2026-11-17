import { useMemo } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { getTodayDate, formatDate, CHART_DAYS } from "../utils/nutritionTracker"

const dayLabel = (iso) => {
  const today = getTodayDate()
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (iso === today) return "Today"
  if (iso === formatDate(y)) return "Yesterday"
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
}

// Compact date chip (Add food sheet and home page): shows "Today"; tapping opens the native calendar.
export default function DateChip({ value, onChange }) {
  const { min, max } = useMemo(() => {
    const t = new Date()
    const m = new Date(t); m.setDate(t.getDate() - (CHART_DAYS - 1))
    return { min: formatDate(m), max: formatDate(t) }
  }, [])
  return (
    // A div (not a label) with overflow hidden: the invisible date input can only be
    // tapped inside the chip, even where Safari draws date inputs larger.
    <div className="relative flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
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
        tabIndex={-1}
        className="absolute inset-0 h-full w-full min-w-0 cursor-pointer appearance-none opacity-0"
      />
    </div>
  )
}

