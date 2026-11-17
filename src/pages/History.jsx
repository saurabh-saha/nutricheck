import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Pencil, Trash2, Check, X, Search, Star, Utensils, CalendarDays, ChevronDown } from "lucide-react";
import Layout from "../components/Layout";
import { auth } from "../utils/firebaseConfig";
import GuestBanner from "../components/GuestBanner";
import { cleanDishLabel } from "../utils/units";
import { getFavorites, addFavorite, removeFavorite, favoriteKey } from "../utils/favorites";
import { getAllEntries, updateEntry, deleteEntry, nutrientMap, MEALS, mealOrder, getTodayDate, formatDate } from "../utils/nutritionTracker";
import { fuzzyScore } from "../utils/fuzzy";

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
  const [dish, setDish] = useState(cleanDishLabel(entry.dish || ""));
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

function EntryRow({ entry, onEdit, onDelete, onToggleFavorite, isFavorite, busy }) {
  const n = entry.nutrition || {};
  return (
    <div className="flex items-center gap-2 p-3">
      {entry.imageUrl?.startsWith("data:") || entry.image ? (
        <img
          src={entry.imageUrl?.startsWith("data:") ? entry.imageUrl : `/${entry.image}`}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white"
          loading="lazy"
        />
      ) : (
        <div className="grid w-10 h-10 shrink-0 place-items-center rounded-lg bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500" aria-hidden>
          <Utensils size={18} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-snug line-clamp-2 break-words">{cleanDishLabel(entry.dish)}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
          {mealLabel(entry.meal) && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {mealLabel(entry.meal)}
            </span>
          )}
          <span className="font-medium text-gray-700 dark:text-gray-300">{toNumber(n.calories)} kcal</span>
          <span>· P {toNumber(n.protein)}g · C {toNumber(n.carbs)}g · F {toNumber(n.fat)}g</span>
        </div>
      </div>
      <button onClick={onToggleFavorite} disabled={busy} aria-pressed={isFavorite}
        aria-label={isFavorite ? `Remove ${entry.dish} from favourites` : `Add ${entry.dish} to favourites`}
        className="p-2 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50">
        <Star size={16} className={isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-400"} />
      </button>
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

// "All dates ▾" / "Today ▾" chip: tap to pick a day from the calendar.
function DayChip({ value, onChange }) {
  const today = getTodayDate();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const label = !value ? "All dates" : value === today ? "Today" : value === formatDate(y) ? "Yesterday"
    : new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="flex items-center gap-1">
      <div className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <CalendarDays size={15} className="text-blue-600" />
        {label}
        <ChevronDown size={14} className="text-gray-400" />
        <input
          type="date"
          value={value || ""}
          max={today}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          aria-label="Show entries for a date"
          className="absolute inset-0 h-full w-full min-w-0 cursor-pointer appearance-none opacity-0"
        />
      </div>
      {value && (
        <button type="button" onClick={() => onChange(null)} aria-label="Show all dates"
          className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default function History() {
  const [user, authLoading] = useAuthState(auth);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(null); // YYYY-MM-DD, or null for all dates
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [favoriteKeys, setFavoriteKeys] = useState(new Set());

  const loadFavorites = async () => {
    try {
      setFavoriteKeys(new Set((await getFavorites()).map((f) => favoriteKey(f.dish))));
    } catch (err) {
      console.error("Couldn't load favourites:", err);
    }
  };

  useEffect(() => {
    // Guests see entries saved on this device; logged-in users see their account.
    const unsubscribe = onAuthStateChanged(auth, async () => {
      setLoading(true);
      loadFavorites();
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
    return entries.filter((e) => (!day || e.date === day)
      && (!q || (e.date || "").includes(q) || fuzzyScore(q, cleanDishLabel(e.dish)) !== null));
  }, [entries, query, day]);

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

  const handleToggleFavorite = async (entry) => {
    const key = favoriteKey(entry.dish);
    try {
      if (favoriteKeys.has(key)) await removeFavorite(entry.dish);
      else await addFavorite({ dish: entry.dish, nutrition: entry.nutrition, imageUrl: entry.imageUrl || null });
      await loadFavorites();
    } catch (err) {
      console.error("Failed to update favourite:", err);
      setError("Couldn't update favourites. Please try again.");
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

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">History</h1>
            {!loading && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>
          <DayChip value={day} onChange={(v) => { setDay(v); setVisible(PAGE_SIZE); }} />
        </div>

        {!authLoading && !user && <GuestBanner />}

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
            {entries.length === 0 ? "Nothing tracked yet. Add food from the Nutrition Tracker."
              : day && !query.trim() ? "Nothing logged on this day."
              : "No entries match your search."}
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
                          isFavorite={favoriteKeys.has(favoriteKey(entry.dish))}
                          onToggleFavorite={() => handleToggleFavorite(entry)}
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
