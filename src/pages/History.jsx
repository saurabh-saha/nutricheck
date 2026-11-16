import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Pencil, Trash2, Check, X, Search } from "lucide-react";
import Layout from "../components/Layout";
import { auth } from "../utils/firebaseConfig";
import { loginWithGoogle } from "../utils/firebaseLogin";
import { getAllEntries, updateEntry, deleteEntry, nutrientMap, MEALS, mealOrder } from "../utils/nutritionTracker";

const PAGE_SIZE = 50;

const mealLabel = (meal) => MEALS.find((m) => m.key === meal)?.label;

// Newest day first; within a day, breakfast -> lunch -> snack -> dinner.
const byDateThenMeal = (a, b) =>
  (b.date || "").localeCompare(a.date || "") || mealOrder(a.meal) - mealOrder(b.meal);

const toNumber = (value) => {
  if (typeof value === "number") return value;
  const n = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatDay = (date) => {
  if (!date) return "No date";
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const inputClass =
  "border rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 w-full";

function EditRow({ entry, onCancel, onSave, saving }) {
  const [date, setDate] = useState(entry.date || "");
  const [dish, setDish] = useState(entry.dish || "");
  const [meal, setMeal] = useState(entry.meal || "");
  const [nutrition, setNutrition] = useState(() =>
    Object.fromEntries(nutrientMap.map(({ key }) => [key, toNumber(entry.nutrition?.[key])]))
  );

  const submit = (e) => {
    e.preventDefault();
    if (!dish.trim() || !date) return;
    onSave({
      date,
      dish: dish.trim(),
      meal: meal || undefined,
      nutrition: { ...entry.nutrition, ...Object.fromEntries(Object.entries(nutrition).map(([k, v]) => [k, toNumber(v)])) },
    });
  };

  return (
    <form onSubmit={submit} className="p-3 space-y-3 bg-gray-50 dark:bg-gray-800/60 rounded">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 text-xs text-gray-500 dark:text-gray-400">
          Dish
          <input className={inputClass} value={dish} onChange={(e) => setDish(e.target.value)} required />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 sm:w-32">
          Meal
          <select className={inputClass} value={meal} onChange={(e) => setMeal(e.target.value)}>
            <option value="">—</option>
            {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 sm:w-40">
          Date
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {nutrientMap.map(({ key, label, unit }) => (
          <label key={key} className="text-xs text-gray-500 dark:text-gray-400">
            {label} ({unit})
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className={inputClass}
              value={nutrition[key]}
              onChange={(e) => setNutrition((n) => ({ ...n, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <X size={16} /> Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60">
          <Check size={16} /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function EntryRow({ entry, onEdit, onDelete, busy }) {
  const n = entry.nutrition || {};
  return (
    <div className="flex items-center gap-3 p-3">
      {entry.imageUrl ? (
        <img src={entry.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {mealLabel(entry.meal) && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {mealLabel(entry.meal)}
            </span>
          )}
          <span className="font-medium truncate">{entry.dish}</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {toNumber(n.calories)} kcal · P {toNumber(n.protein)}g · C {toNumber(n.carbs)}g · F {toNumber(n.fat)}g · Fiber {toNumber(n.fiber)}g
        </div>
      </div>
      <button onClick={onEdit} disabled={busy} aria-label={`Edit ${entry.dish}`}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50">
        <Pencil size={16} />
      </button>
      <button onClick={onDelete} disabled={busy} aria-label={`Delete ${entry.dish}`}
        className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function History() {
  const [user, authLoading] = useAuthState(auth);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setEntries([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        setEntries((await getAllEntries()).sort(byDateThenMeal));
        setError("");
      } catch (err) {
        console.error("Failed to load history:", err);
        setError("Couldn't load your history. Please try again.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => (e.dish || "").toLowerCase().includes(q) || (e.date || "").includes(q)) : entries;
  }, [entries, query]);

  // Group the visible rows by day, keeping newest-first order.
  const groups = useMemo(() => {
    const map = new Map();
    filtered.slice(0, visible).forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return [...map.entries()];
  }, [filtered, visible]);

  const handleSave = async (id, changes) => {
    setBusyId(id);
    try {
      await updateEntry(id, changes);
      setEntries((list) =>
        list.map((e) => (e.id === id ? { ...e, ...changes } : e)).sort(byDateThenMeal)
      );
      setEditingId(null);
      setError("");
    } catch (err) {
      console.error("Failed to update entry:", err);
      setError("Couldn't save that change. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.dish}" from ${formatDay(entry.date)}? This can't be undone.`)) return;
    setBusyId(entry.id);
    try {
      await deleteEntry(entry.id);
      setEntries((list) => list.filter((e) => e.id !== entry.id));
      setError("");
    } catch (err) {
      console.error("Failed to delete entry:", err);
      setError("Couldn't delete that entry. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h1 className="text-xl font-semibold">Your food history</h1>
          <p className="text-gray-600 dark:text-gray-400">Log in to see, edit and delete everything you've tracked.</p>
          <button onClick={() => loginWithGoogle()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
            Login with Google
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">History</h1>
          {!loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="border rounded pl-9 pr-3 py-2 w-full bg-white text-gray-800 placeholder:text-gray-500"
            placeholder="Search dishes or dates (e.g. 2026-11)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
          />
        </label>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading your history…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            {entries.length === 0 ? "Nothing tracked yet. Add food from the Nutrition Tracker." : "No entries match your search."}
          </p>
        ) : (
          <>
            {groups.map(([date, dayEntries]) => {
              const dayCalories = dayEntries.reduce((sum, e) => sum + toNumber(e.nutrition?.calories), 0);
              return (
                <section key={date || "no-date"} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <header className="flex justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 text-sm font-medium">
                    <span>{formatDay(date)}</span>
                    <span className="text-gray-500 dark:text-gray-400">{Math.round(dayCalories)} kcal</span>
                  </header>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {dayEntries.map((entry) =>
                      editingId === entry.id ? (
                        <EditRow
                          key={entry.id}
                          entry={entry}
                          saving={busyId === entry.id}
                          onCancel={() => setEditingId(null)}
                          onSave={(changes) => handleSave(entry.id, changes)}
                        />
                      ) : (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          busy={busyId === entry.id}
                          onEdit={() => setEditingId(entry.id)}
                          onDelete={() => handleDelete(entry)}
                        />
                      )
                    )}
                  </div>
                </section>
              );
            })}

            {visible < filtered.length && (
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="w-full py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Show more ({filtered.length - visible} left)
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
