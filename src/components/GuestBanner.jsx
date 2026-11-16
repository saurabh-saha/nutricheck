import { CloudOff } from "lucide-react";
import { loginWithGoogle } from "../utils/firebaseLogin";

// Shown to guests: their data only lives in this browser until they log in.
export default function GuestBanner({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700 text-sm ${className}`}>
      <CloudOff size={18} className="shrink-0" />
      <p className="flex-1">
        You're using NutriCheck as a guest. Entries are saved on this device only. Log in to back them up and use them on any device.
      </p>
      <button
        onClick={() => loginWithGoogle()}
        className="shrink-0 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
      >
        Log in
      </button>
    </div>
  );
}
