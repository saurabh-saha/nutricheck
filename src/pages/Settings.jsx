import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDarkModeContext } from "../context/DarkModeContext";
import { Switch } from "../components/ui/switch";
import Layout from '../components/Layout'
import { auth } from "../utils/firebaseConfig";
import { getReminderSettings, setEmailReminders, sendTestReminder, loginWithGoogle } from "../utils/firebaseLogin";

export default function Settings() {
  const { isDark, toggle } = useDarkModeContext();
  const [user] = useAuthState(auth);
  const [emailReminders, setEmailRemindersState] = useState(null);
  const [error, setError] = useState("");
  const [testState, setTestState] = useState({ sending: false, message: "", dryRun: null });

  const handleTest = async () => {
    setTestState({ sending: true, message: "", dryRun: null });
    try {
      const { sentTo, dryRun } = await sendTestReminder();
      setTestState({ sending: false, message: `Test email sent to ${sentTo}. Check your inbox (and spam).`, dryRun });
    } catch (err) {
      setTestState({ sending: false, message: err.message, dryRun: null, failed: true });
    }
  };

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
                {user && (
                    <div className="p-4 space-y-2">
                        <button
                            onClick={handleTest}
                            disabled={testState.sending}
                            className="text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            {testState.sending ? "Sending…" : "Send me a test reminder"}
                        </button>
                        {testState.message && (
                            <p className={`text-sm ${testState.failed ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                                {testState.message}
                            </p>
                        )}
                        {testState.dryRun && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <p className="font-medium">Admin dry run (nothing sent):</p>
                                {["morning", "evening"].map((b) => {
                                    const r = testState.dryRun[b];
                                    return (
                                        <p key={b}>
                                            {b === "morning" ? "10:00" : "20:00"} ({r.day}): {r.eligible} of {r.users} users would get an email
                                        </p>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    </Layout>
  );
}
