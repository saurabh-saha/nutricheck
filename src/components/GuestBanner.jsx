import { CloudOff } from "lucide-react";
import { loginWithGoogle } from "../utils/firebaseLogin";

// Shown to guests: their data only lives in this browser until they log in.
export default function GuestBanner({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200 ${className}`}>
      <CloudOff size={18} className="shrink-0" />
      <p className="flex-1">
        Saved on this device only. Log in to back up and sync.
      </p>
      <button
        onClick={() => loginWithGoogle()}
        className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
      >
        Log in
      </button>
    </div>
  );
}
