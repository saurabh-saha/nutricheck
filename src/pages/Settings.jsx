import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDarkModeContext } from "../context/DarkModeContext";
import { Switch } from "../components/ui/switch";
import Layout from '../components/Layout'
import { auth } from "../utils/firebaseConfig";
import { getReminderSettings, setEmailReminders, loginWithGoogle } from "../utils/firebaseLogin";

export default function Settings() {
  const { isDark, toggle } = useDarkModeContext();
  const [user] = useAuthState(auth);
  const [emailReminders, setEmailRemindersState] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setEmailRemindersState(null); return; }
    getReminderSettings()
      .then((s) => setEmailRemindersState(s?.email ?? true))
      .catch((err) => { console.error(err); setError("Couldn't load reminder settings."); });
  }, [user]);

  const handleReminderToggle = async (enabled) => {
    const previous = emailReminders;
    setEmailRemindersState(enabled);
    try {
      await setEmailReminders(enabled);
      setError("");
    } catch (err) {
      console.error(err);
      setEmailRemindersState(previous);
      setError("Couldn't save that setting. Please try again.");
    }
  };

  return (
    <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Settings</h1>

            <div className="bg-white dark:bg-gray-800 rounded shadow border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{isDark ? "🌙" : "☀️"}</span>
                        <Switch checked={isDark} onCheckedChange={toggle} />
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4 p-4">
                    <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Email reminders</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            10:00 if you didn't log yesterday, 20:00 if you're well under your goal (India time).
                        </div>
                    </div>
                    {user ? (
                        <Switch
                            checked={Boolean(emailReminders)}
                            disabled={emailReminders === null}
                            onCheckedChange={handleReminderToggle}
                            aria-label="Email reminders"
                        />
                    ) : (
                        <button onClick={() => loginWithGoogle()} className="shrink-0 text-sm px-3 py-1.5 rounded bg-blue-600 text-white">
                            Log in
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    </Layout>
  );
}
