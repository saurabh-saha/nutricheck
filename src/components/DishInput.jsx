import { useState, useRef, useEffect } from "react"
import { Sunrise, Sun, Cookie, Moon, Check, RotateCcw, Plus } from "lucide-react"
import { getDishSuggestionsFromGemini } from '../utils/gemini.jsx'
import { MEALS, defaultMealForNow } from "../utils/nutritionTracker"
import { UNITS, unitInfo, cleanDishLabel, isMeasure } from "../utils/units"
import { favoriteKey } from "../utils/favorites"
import FadeScale from "./ui/FadeScale";
import DishComposer from "./DishComposer";
import PortionPicker from "./PortionPicker";

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, snack: Cookie, dinner: Moon };

const photosKeyOf = (photos) => photos.map(f => `${f.name}:${f.size}:${f.lastModified}`).join("|");

// "4 piece of egg white" -> { quantity: 4, unit: "piece", name: "egg white" }
const parseLabel = (label) => {
  const clean = cleanDishLabel(label);
  const m = clean.match(/^(\d+(?:\.\d+)?)\s+(\S+)\s+of\s+(.+)$/i);
  if (m && UNITS.some(u => u.key === m[2].toLowerCase())) {
    return { quantity: Number(m[1]), unit: m[2].toLowerCase(), name: m[3].trim() };
  }
  return { quantity: 1, unit: null, name: clean };
};

// Nutrition for a different amount of the same food.
const scaleNutrition = (nutrition, ratio) => {
  if (!nutrition || ratio === 1) return nutrition;
  const out = {};
  for (const [k, v] of Object.entries(nutrition)) {
    const n = Number(v);
    out[k] = Number.isFinite(n) ? Math.round(n * ratio) : v;
  }
  return out;
};

const unitWord = (quantity, unit) => {
  const info = unitInfo(unit);
  if (!info) return `${quantity} ${unit}`;
  if (isMeasure(unit)) return `${quantity} ${unit}`;
  return `${quantity} ${info.label.toLowerCase()}${quantity > 1 ? "s" : ""}`;
};

/**
 * Find a food and (when tracking) add it.
 * - tracking=false (Calorie Finder): tapping a suggestion shows its nutrition right away.
 * - tracking=true (Add food sheet): tapping a suggestion or a Recent fills the form;
 *   the user can tweak it and then tap Add, or search again.
 */
export default function DishInput({ onSelect, onClose, selectedDate, tracking = false, quickAdd = null, initial = null }) {
    // `initial` (home page): { dish, quantity, unit, photoUrl, results, note, autoSearch }
    const [dish, setDish] = useState(initial?.dish ?? "");
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [unit, setUnit] = useState(initial?.unit ?? "bowl");
    const [photos, setPhotos] = useState([]);
    const [note, setNote] = useState(initial?.note ?? "");
    const [meal, setMeal] = useState(defaultMealForNow);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(initial?.results ?? null);
    const [searchError, setSearchError] = useState("");
    const [picked, setPicked] = useState(null); // { key, name, quantity, unit, nutrition, photosKey, imageUrl }
    const [closing, setClosing] = useState(false);
    const textInputRef = useRef(null);
    const lastSearchKeyRef = useRef(null);
    const latestRequestRef = useRef(0);

    useEffect(() => {
      // Desktop only, and not when we arrive with a ready example/search.
      if (!initial && window.matchMedia?.("(pointer: fine)").matches) textInputRef.current?.focus();
    }, []);

    // Example photo: load it into the first photo slot (as a real File).
    useEffect(() => {
      if (!initial?.photoUrl) return;
      let cancelled = false;
      fetch(initial.photoUrl)
        .then(r => r.blob())
        .then(b => { if (!cancelled) setPhotos([new File([b], initial.photoUrl.split("/").pop(), { type: b.type || "image/jpeg", lastModified: 0 })]); })
        .catch(() => {});
      return () => { cancelled = true; };
    }, []);

    const photosKey = photosKeyOf(photos);
    const pickValid = Boolean(picked)
      && dish.trim().toLowerCase() === picked.name.toLowerCase()
      && unit === picked.unit
      && photosKey === picked.photosKey;
    const pickedNutrition = pickValid ? scaleNutrition(picked.nutrition, quantity / picked.quantity) : null;
    const canSearch = Boolean(dish.trim() || photos.length);

    const handleSearch = async ({ force = false } = {}) => {
        if (!canSearch) return;
        const searchKey = `${dish.trim().toLowerCase()}|${quantity}|${unit}|${photosKey}`;
        if (!force && searchKey === lastSearchKeyRef.current && result) return;
        lastSearchKeyRef.current = searchKey;

        const requestId = ++latestRequestRef.current;
        setIsLoading(true);
        setSearchError("");
        setPicked(null);
        setNote("");
        let suggestions = [];
        try {
            suggestions = await getDishSuggestionsFromGemini(dish, quantity, unit, photos);
        } catch (err) {
            if (requestId === latestRequestRef.current) setSearchError(err.message || "Search failed. Please try again.");
        }
        if (requestId !== latestRequestRef.current) return; // a newer search superseded this one
        setIsLoading(false);
        if (Array.isArray(suggestions) && suggestions.length > 0) setResult(suggestions);
        else lastSearchKeyRef.current = null; // allow retrying after a failure
    };

    // A dish from a marketing link (?q=...) is searched straight away.
    useEffect(() => {
      if (initial?.autoSearch) handleSearch({ force: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const pickSuggestion = (item, idx) => {
        if (!tracking) {
            onSelect?.(item.name, quantity, unit, item.nutrition, photos);
            return;
        }
        setDish(item.name);
        setPicked({ key: `s${idx}`, name: item.name, quantity, unit, nutrition: item.nutrition, photosKey, imageUrl: null });
    };

    const pickRecent = (item) => {
        const parsed = parseLabel(item.dish);
        const u = parsed.unit || unit;
        setDish(parsed.name);
        setQuantity(parsed.quantity);
        setUnit(u);
        setPhotos([]);
        setResult(null);
        setSearchError("");
        setPicked({
          key: favoriteKey(cleanDishLabel(item.dish)),
          name: parsed.name, quantity: parsed.quantity, unit: u,
          nutrition: item.nutrition, photosKey: "", imageUrl: item.imageUrl || null,
        });
    };

    const handleAdd = () => {
        if (!pickValid) return;
        setClosing(true);
        setTimeout(() => {
            onSelect?.(picked.name, quantity, unit, pickedNutrition, photos, selectedDate, meal, picked.imageUrl);
            setDish(""); setQuantity(1); setUnit("bowl"); setPhotos([]);
            setResult(null); setPicked(null); setClosing(false);
            onClose?.();
        }, 250);
    };

    const portion = unitWord(quantity, unit);

    // Dropdown suggestions: favourites first, then recent foods (deduplicated).
    const suggestions = (() => {
        if (!tracking || !quickAdd) return [];
        const seen = new Set();
        const out = [];
        for (const [list, fav] of [[quickAdd.favorites || [], true], [quickAdd.recent || [], false]]) {
            for (const it of list) {
                const label = cleanDishLabel(it.dish);
                const key = favoriteKey(label);
                if (seen.has(key)) continue;
                seen.add(key);
                out.push({ key, label, kcal: Math.round(Number(it.nutrition?.calories) || 0), fav, imageUrl: it.imageUrl, source: it });
            }
        }
        return out;
    })();

    return (
        <FadeScale isClosing={closing}>
            <div className="flex w-full min-w-0 flex-col gap-4">
                {/* 1. The question every visit starts with */}
                <DishComposer
                    inputRef={textInputRef}
                    value={dish}
                    onChange={setDish}
                    photos={photos}
                    onPhotos={setPhotos}
                    onSubmit={() => handleSearch({ force: true })}
                    suggestions={suggestions}
                    onPickSuggestion={(s) => pickRecent(s.source)}
                    onToggleFavorite={tracking && quickAdd ? (s) => quickAdd.onToggleFavorite(s.source, s.fav) : undefined}
                />

                {/* 2. How much */}
                <PortionPicker quantity={quantity} setQuantity={setQuantity} unit={unit} setUnit={setUnit} />

                {/* 3. Which meal (pre-set from the time of day) */}
                {tracking && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Meal</span>
                    <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup" aria-label="Meal">
                      {MEALS.map(m => {
                        const Icon = MEAL_ICONS[m.key];
                        const active = meal === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setMeal(m.key)}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${active
                              ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-white"
                              : "text-gray-600 dark:text-gray-300"}`}
                          >
                            <Icon size={14} className={active ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
                )}

                {Array.isArray(result) && result.length > 0 && (
                    <div className="space-y-2">
                        {note
                          ? <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">{note}</p>
                          : <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Pick the closest match</p>}
                        {result.map((item, idx) => {
                            const selected = pickValid && picked.key === `s${idx}`;
                            const n = (selected ? pickedNutrition : item.nutrition) || {};
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => pickSuggestion(item, idx)}
                                    aria-pressed={selected}
                                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition active:scale-[0.98] dark:bg-gray-800 ${selected
                                      ? "border-blue-600 ring-2 ring-blue-600"
                                      : "border-gray-200 dark:border-gray-700"}`}
                                >
                                    <img src={`/${item.image}`} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{n.protein ?? 0} g protein</span>
                                          {portion} · C {n.carbs ?? 0}g · F {n.fat ?? 0}g
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        {selected
                                          ? <Check size={20} className="ml-auto text-blue-600" />
                                          : <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{n.calories ?? 0}</span>}
                                        <span className="block text-[10px] text-gray-500">{selected ? "selected" : "kcal"}</span>
                                    </span>
                                </button>
                            );
                        })}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            AI estimates, not medical advice. Values can vary by recipe and portion.
                        </p>
                    </div>
                )}

                {/* Action bar: stays at the bottom of the sheet */}
                <div className="sticky bottom-0 -mx-4 mt-auto border-t border-gray-200 bg-gray-50/95 px-4 pb-1 pt-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:-mx-6 sm:px-6">
                    {pickValid ? (
                      <div className="space-y-2">
                        <p className="truncate text-sm text-gray-700 dark:text-gray-200">
                          <b>{portion}</b> of {picked.name}
                          <span className="text-gray-500 dark:text-gray-400"> · P {pickedNutrition.protein ?? 0}g · C {pickedNutrition.carbs ?? 0}g · F {pickedNutrition.fat ?? 0}g</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSearch({ force: true })}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-300 px-4 py-3.5 text-sm font-medium text-gray-700 active:scale-[0.98] disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                          >
                            <RotateCcw size={16} /> {isLoading ? "Searching…" : "Search again"}
                          </button>
                          <button
                            type="button"
                            onClick={handleAdd}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98]"
                          >
                            <Plus size={18} /> Add · {pickedNutrition.calories ?? 0} kcal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {picked && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">You changed the details. Search again to update the nutrition.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSearch({ force: true })}
                          disabled={isLoading || !canSearch}
                          className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                        >
                          {isLoading ? "Finding nutrition…" : `Find nutrition for ${portion}`}
                        </button>
                      </div>
                    )}
                </div>
            </div>
        </FadeScale>
    )
}
