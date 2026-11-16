import { useState, useRef, useEffect, useMemo } from "react"
import { getDishSuggestionsFromGemini } from '../utils/gemini.jsx'
import { CHART_DAYS, MEALS, defaultMealForNow } from "../utils/nutritionTracker"
import { unitInfo } from "../utils/units"
import FadeScale from "./ui/FadeScale";
import QuickAdd from "./QuickAdd";
import DishComposer from "./DishComposer";
import PortionPicker from "./PortionPicker";

const MEAL_EMOJI = { breakfast: "🌅", lunch: "☀️", snack: "🍪", dinner: "🌙" };

export default function DishInput({ 
    onSelect,
    onClose,
    selectedDate,
    setSelectedDate,
    initialDish = "",
    initialQuantity = 1,
    initialUnit = "bowl",
    quickAdd = null // { favorites, recent, onAdd(item, date, meal), onToggleFavorite, busy }
  }) {
    const [dish, setDish] = useState(initialDish);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [unit, setUnit] = useState(initialUnit);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [closing, setClosing] = useState(false);
    const [dishImage, setDishImage] = useState(null);
    const [searchError, setSearchError] = useState("");
    const [meal, setMeal] = useState(defaultMealForNow);
    const isTracking = Boolean(setSelectedDate); // logging to the tracker (vs. quick lookup)
    const textInputRef = useRef(null);

    useEffect(() => {
      // Desktop only: on phones the keyboard would cover the quick-add row.
      if (window.matchMedia?.("(pointer: fine)").matches) textInputRef.current?.focus();
    }, []);

    const debounceRef = useRef(null);
    const lastSearchKeyRef = useRef(null);
    const latestRequestRef = useRef(0);

    const handleSearch = async (searchTerm = dish) => {
        // A manual search replaces any pending auto-search.
        clearTimeout(debounceRef.current);
        if (!searchTerm.trim() && !dishImage) return;

        // Skip if this exact search is already in flight or on screen.
        const imageKey = dishImage ? `${dishImage.name}:${dishImage.size}:${dishImage.lastModified}` : '';
        const searchKey = `${searchTerm.trim().toLowerCase()}|${quantity}|${unit}|${imageKey}`;
        if (searchKey === lastSearchKeyRef.current) return;
        lastSearchKeyRef.current = searchKey;

        const requestId = ++latestRequestRef.current;
        setIsLoading(true);
        setSearchError("");
        let suggestions = [];
        try {
            suggestions = await getDishSuggestionsFromGemini(searchTerm, quantity, unit, dishImage);
        } catch (err) {
            if (requestId === latestRequestRef.current) setSearchError(err.message || "Search failed. Please try again.");
        }
        if (requestId !== latestRequestRef.current) return; // a newer search superseded this one
        setIsLoading(false);

        if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
            setResult(suggestions);
        } else {
            lastSearchKeyRef.current = null; // allow retrying the same search after a failure
        }
    };

    // Auto-search while typing (debounced)
    useEffect(() => {
        debounceRef.current = setTimeout(() => {
            if (dish.length >= 3) {
                handleSearch();
            }
        }, 1200);
        return () => clearTimeout(debounceRef.current);
    }, [dish]);

    const handleConfirmSelection = (item) => {
        if (item) {
          setClosing(true); // start fade animation
          setTimeout(() => {
            onSelect?.(item.name, quantity, unit, item.nutrition, dishImage, selectedDate, meal);
            setDish("");
            setQuantity(1);
            setUnit("bowl");
            setResult(null);
            setClosing(false);
            onClose?.();
          }, 300);
        }
      };

    const { minDate, maxDate } = useMemo(() => {
        const todayVal = new Date();
        const minVal = new Date(todayVal);
        minVal.setDate(todayVal.getDate() - (CHART_DAYS - 1));
        const fmt = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        return { minDate: fmt(minVal), maxDate: fmt(todayVal) };
    }, []);

    const info = unitInfo(unit);
    const unitWord = info ? (unit === "g" || unit === "ml" ? unit : info.label.toLowerCase()) : unit;
    const portionLabel = `${quantity} ${unitWord}${quantity > 1 && unit !== "g" && unit !== "ml" ? "s" : ""}`;

    return (
        <FadeScale isClosing={closing}>
            <div className="flex w-full min-w-0 flex-col gap-4">
                {/* Meal + date (tracker only) */}
                {isTracking && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Meal">
                      {MEALS.map(m => (
                        <button
                          key={m.key}
                          type="button"
                          role="radio"
                          aria-checked={meal === m.key}
                          onClick={() => setMeal(m.key)}
                          className={`flex flex-col items-center rounded-xl border py-2 text-xs font-medium transition active:scale-95 ${meal === m.key ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700"}`}
                        >
                          <span className="text-lg leading-none" aria-hidden>{MEAL_EMOJI[m.key]}</span>
                          <span className="mt-1">{m.label}</span>
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <span>📅 Date</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="bg-transparent text-right text-sm text-gray-900 focus:outline-none"
                      />
                    </label>
                  </div>
                )}

                {/* One-tap re-log of favourites / recent foods */}
                {isTracking && quickAdd && !dish.trim() && !dishImage && !result && (
                  <QuickAdd
                    favorites={quickAdd.favorites}
                    recent={quickAdd.recent}
                    busy={quickAdd.busy}
                    onToggleFavorite={quickAdd.onToggleFavorite}
                    onAdd={(item) => quickAdd.onAdd(item, selectedDate, meal)}
                  />
                )}

                <DishComposer
                    inputRef={textInputRef}
                    value={dish}
                    onChange={setDish}
                    image={dishImage}
                    onImage={setDishImage}
                    onSubmit={() => handleSearch()}
                />

                <PortionPicker quantity={quantity} setQuantity={setQuantity} unit={unit} setUnit={setUnit} />

                <button
                    onClick={() => handleSearch()}
                    disabled={isLoading || (!dish.trim() && !dishImage)}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                >
                    {isLoading ? "Finding nutrition…" : `Find nutrition for ${portionLabel}`}
                </button>

                {searchError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
                )}

                {/* Results */}
                {Array.isArray(result) && result.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Pick the closest match</p>
                        {result.map((item, idx) => {
                            const n = item.nutrition || {};
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleConfirmSelection(item)}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.98]"
                                >
                                    <img src={`/${item.image}`} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-gray-900">{item.name}</span>
                                        <span className="block text-xs text-gray-500">{portionLabel} · P {n.protein ?? 0}g · C {n.carbs ?? 0}g · F {n.fat ?? 0}g</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-lg font-bold text-gray-900">{n.calories ?? 0}</span>
                                        <span className="block text-[10px] text-gray-500">kcal</span>
                                    </span>
                                </button>
                            );
                        })}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            AI estimates, not medical advice. Values can vary by recipe and portion.
                        </p>
                    </div>
                )}
            </div>
        </FadeScale>
    )
}
