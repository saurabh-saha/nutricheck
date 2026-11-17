import { useState } from "react"
import { Link } from "react-router-dom"
import { Scale, X } from "lucide-react"
import { daysSince } from "../utils/goals"

const SNOOZE_KEY = "weightNudgeSnoozedAt"
const EVERY_DAYS = 5
const SNOOZE_DAYS = 3

// "Last weighed 6 days ago": a nudge to keep the goal accurate.
export default function WeightNudge({ profile }) {
  const [snoozedAt, setSnoozedAt] = useState(() => { try { return localStorage.getItem(SNOOZE_KEY) } catch { return null } })
  if (!profile?.weight) return null
  const days = daysSince(profile.weightUpdatedAt)
  if (days !== null && days < EVERY_DAYS) return null
  const snoozed = daysSince(snoozedAt)
  if (snoozed !== null && snoozed < SNOOZE_DAYS) return null

  const snooze = () => {
    const now = new Date().toISOString()
    try { localStorage.setItem(SNOOZE_KEY, now) } catch { /* private mode */ }
    setSnoozedAt(now)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
        <Scale size={20} />
      </span>
      <Link to="/profile?focus=weight" className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Still {profile.weight} kg?</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {days === null ? "Update your weight to keep your goal accurate" : `Last updated ${days} days ago · Update →`}
        </span>
      </Link>
      <button type="button" onClick={snooze} aria-label="Remind me later" className="grid h-9 w-9 place-items-center rounded-full text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}
