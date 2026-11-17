import { useState, useRef, useEffect } from "react"
import { Sunrise, Sun, Cookie, Moon, Check, RotateCcw, Plus, ChevronUp } from "lucide-react"
import { getDishSuggestionsFromGemini } from '../utils/gemini.jsx'
import { MEALS, defaultMealForNow } from "../utils/nutritionTracker"
import { UNITS, unitInfo, cleanDishLabel, isMeasure, parseFoodQuery, inferUnit, nutritionFor } from "../utils/units"
import { favoriteKey } from "../utils/favorites"
import { DEFAULT_EXAMPLE } from "../utils/landingSearch"
import FadeScale from "./ui/FadeScale";
import { toast } from "../hooks/use-toast";
import DishComposer, { MIN_QUERY } from "./DishComposer";
import PortionPicker from "./PortionPicker";

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, snack: Cookie, dinner: Moon };
// Shown in turn while the AI works, so the wait feels alive.
const LOADING_LINES = ["Weighing the ingredients…", "Counting the protein…", "Checking the portion…", "Almost there…"];
const UNIT_KEYS = new Set(UNITS.map(u => u.key));

const photosKeyOf = (photos) => photos.map(f => `${f.name}:${f.size}:${f.lastModified}`).join("|");

const unitWord = (quantity, unit) => {
  const info = unitInfo(unit);
  if (!info) return `${quantity} ${unit}`;
  if (isMeasure(unit)) return `${quantity} ${unit}`;
  return `${quantity} ${info.label.toLowerCase()}${quantity > 1 ? "s" : ""}`;
};

// A logged entry ("4 piece of egg white") as something we can rescale.
const fromEntry = (entry) => {
  const parsed = parseFoodQuery(cleanDishLabel(entry.dish));
  return {
    name: parsed.food,
    baseQuantity: parsed.quantity || 1,
    baseUnit: parsed.unit && UNIT_KEYS.has(parsed.unit) ? parsed.unit : null,
    nutrition: entry.nutrition,
    per100g: entry.per100g,
    unitGrams: entry.unitGrams,
    defaultUnit: entry.defaultUnit,
    image: entry.image,
    imageUrl: entry.imageUrl || null,
  };
};

const portionData = (item) => ({
  ...(item.image ? { image: item.image } : {}), // dish image to show when there's no photo
  ...(item.per100g ? { per100g: item.per100g } : {}),
  ...(item.unitGrams ? { unitGrams: item.unitGrams } : {}),
  ...(item.defaultUnit ? { defaultUnit: item.defaultUnit } : {}),
});

/**
 * Find a food and (when tracking) add it.
 * - The amount is worked out from what you type ("2 eggs", "200g paneer") or the
 *   food itself (eggs -> pieces, tea -> cups), and stays tucked away unless changed.
 * - Results carry per-100 g data, so changing the amount never needs a new search.
 * - tracking=false (home page): tapping a result shows its nutrition right away.
 * - tracking=true (Add food sheet): tapping a result fills the form; then Add.
 */
export default function DishInput({ onSelect, onClose, selectedDate, tracking = false, quickAdd = null, initial = null }) {
    // `initial` (home page): { dish, quantity, unit, photoUrl, results, note, autoSearch }
    const [dish, setDish] = useState(initial?.dish ?? "");
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [unit, setUnit] = useState(initial?.unit ?? "bowl");
    const [amountTouched, setAmountTouched] = useState(Boolean(initial?.unitExplicit));
    const [amountOpen, setAmountOpen] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [note, setNote] = useState(initial?.note ?? "");
    const [meal, setMeal] = useState(defaultMealForNow);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(initial?.results ?? null);
    const [attempt, setAttempt] = useState(null);        // { n, max } while retrying
    const [cooldownUntil, setCooldownUntil] = useState(0); // after repeated failures
    const [, setTick] = useState(0);
    const failStreakRef = useRef(0);
    const [loadingLine, setLoadingLine] = useState(0);
    const [picked, setPicked] = useState(null); // { key, item, photosKey }
    const [catalog, setCatalog] = useState([]);
    const [searchedFor, setSearchedFor] = useState(initial?.results ? { food: (initial.dish || "").toLowerCase(), photos: null } : null);
    const [closing, setClosing] = useState(false);
    const textInputRef = useRef(null);
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

    // Dishes the app already knows (shared catalogue), for the dropdown. No AI involved.
    useEffect(() => {
      const q = parseFoodQuery(dish).food.trim();
      if (q.length < MIN_QUERY) { setCatalog([]); return; }
      const ctrl = new AbortController();
      const t = setTimeout(() => {
        fetch(`/.netlify/functions/foods?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
          .then(r => (r.ok ? r.json() : { items: [] }))
          .then(d => setCatalog(Array.isArray(d.items) ? d.items : []))
          .catch(() => {});
      }, 250);
      return () => { clearTimeout(t); ctrl.abort(); };
    }, [dish]);

    // Typing sets the amount until the user changes it themselves:
    // "2 eggs" -> 2 pieces, "200g paneer" -> 200 g, "tea" -> cup.
    const changeDish = (text) => {
        setDish(text);
        if (amountTouched) return;
        const p = parseFoodQuery(text);
        // A new dish starts from its own amount ("2 eggs" -> 2), otherwise 1.
        setQuantity(p.quantity ?? 1);
        const u = p.unit || inferUnit(p.food);
        if (u) setUnit(u);
    };
    const changeQuantity = (q) => { setAmountTouched(true); setQuantity(q); };
    const changeUnit = (u) => { setAmountTouched(true); setUnit(u); };

    const photosKey = photosKeyOf(photos);
    const pickedNutrition = picked ? nutritionFor(picked.item, quantity, unit) : null;
    const pickValid = Boolean(picked && pickedNutrition)
      && dish.trim().toLowerCase() === picked.item.name.toLowerCase()
      && photosKey === picked.photosKey;
    const queryLength = parseFoodQuery(dish).food.trim().length;
    const canSearch = queryLength >= MIN_QUERY || photos.length > 0;
    // Results on screen still match the text/photos: the next step is to pick one, not search again.
    const dishLower = parseFoodQuery(dish).food.trim().toLowerCase();
    // Results belong to the text that produced them (or a result picked from them).
    const resultsMatchText = Boolean(Array.isArray(result) && result.length && searchedFor
      && (dishLower === searchedFor.food || result.some(r => r.name.toLowerCase() === dish.trim().toLowerCase())));
    const resultsFresh = Boolean(Array.isArray(result) && result.length && searchedFor
      && parseFoodQuery(dish).food.trim().toLowerCase() === searchedFor.food
      && (searchedFor.photos === null || photosKey === searchedFor.photos));

    useEffect(() => {
        if (!isLoading) { setLoadingLine(0); return; }
        const t = setInterval(() => setLoadingLine(i => Math.min(i + 1, LOADING_LINES.length - 1)), 1400);
        return () => clearInterval(t);
    }, [isLoading]);

    const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    // Re-render every second while cooling down, for the countdown.
    useEffect(() => {
        if (!cooldownLeft) return;
        const t = setInterval(() => setTick(x => x + 1), 1000);
        return () => clearInterval(t);
    }, [cooldownLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = async () => {
        if (!canSearch || cooldownLeft > 0) return;
        // Use the amount typed into the box ("2 eggs"), and search for the food alone.
        const p = parseFoodQuery(dish);
        const food = p.food;
        const q = p.quantity ?? quantity;
        const inferred = inferUnit(food);
        const u = p.unit || (amountTouched ? unit : inferred || unit);
        if (food !== dish) setDish(food);
        setQuantity(q);
        setUnit(u);

        const requestId = ++latestRequestRef.current;
        setIsLoading(true);
        setPicked(null);
        setNote("");
        let suggestions = [];
        try {
            suggestions = await getDishSuggestionsFromGemini(food, q, u, photos, {
                onAttempt: (n, max) => { if (requestId === latestRequestRef.current) setAttempt({ n, max }); },
            });
            failStreakRef.current = 0;
        } catch (err) {
            if (requestId === latestRequestRef.current) {
                if (err.transient) {
                    // Already retried with backoff; now cool off for longer each time (5s, 10s, 20s… max 60s).
                    failStreakRef.current += 1;
                    const wait = Math.min(60, 5 * 2 ** (failStreakRef.current - 1));
                    setCooldownUntil(Date.now() + wait * 1000);
                    toast({ title: "Couldn't get nutrition", description: err.message, variant: "destructive" });
                } else {
                    toast({ title: "Search not available", description: err.message || "Please try again.", variant: "destructive" });
                }
            }
        }
        if (requestId !== latestRequestRef.current) return; // a newer search superseded this one
        setIsLoading(false);
        setAttempt(null);
        if (!Array.isArray(suggestions) || !suggestions.length) return;
        // Older cached answers don't say which serving they're for: it's the one we asked.
        const items = suggestions.map(s => ({ baseQuantity: q, baseUnit: u, ...s }));
        setResult(items);
        setSearchedFor({ food: food.trim().toLowerCase(), photos: photosKey });
        // Nothing told us the unit: use the AI's natural unit for this dish.
        const aiUnit = items[0]?.defaultUnit;
        if (!amountTouched && !p.unit && !inferred && UNIT_KEYS.has(aiUnit)) setUnit(aiUnit);
    };

    // A dish from a marketing link (?q=...) is searched straight away.
    useEffect(() => {
      if (initial?.autoSearch) handleSearch();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Choose an item (search result, recent or known dish).
    const choose = (item, key, { adoptAmount = false } = {}) => {
        let q = quantity;
        let u = unit;
        if (adoptAmount && item.baseUnit) { q = item.baseQuantity; u = item.baseUnit; }
        else if (!amountTouched) u = item.defaultUnit || inferUnit(item.name) || unit;
        if (!tracking) {
            onSelect?.(item.name, q, u, nutritionFor(item, q, u) || item.nutrition, photos);
            return;
        }
        setDish(item.name);
        setQuantity(q);
        setUnit(u);
        setPicked({ key, item, photosKey });
    };

    const pickFromDropdown = (s) => {
        if (s.group === "Recent") {
            setPhotos([]);
            setResult(null);
                choose(s.item, s.key, { adoptAmount: true });
        } else {
            choose(s.item, s.key);
        }
    };

    const handleAdd = () => {
        if (!pickValid) return;
        setClosing(true);
        setTimeout(() => {
            onSelect?.(picked.item.name, quantity, unit, pickedNutrition, photos, selectedDate, meal, picked.item.imageUrl || null, portionData(picked.item));
            setDish(""); setQuantity(1); setUnit("bowl"); setAmountTouched(false); setPhotos([]);
            setResult(null); setPicked(null); setClosing(false);
            onClose?.();
        }, 250);
    };

    const portion = unitWord(quantity, unit);

    // Dropdown: your recent foods, then dishes the app already knows.
    const suggestions = (() => {
        const seen = new Set();
        const out = [];
        const add = (group, item, extra = {}) => {
            const key = favoriteKey(item.name);
            if (seen.has(key)) return;
            seen.add(key);
            const n = nutritionFor(item, item.baseQuantity, item.baseUnit) || item.nutrition || {};
            const kcal = Math.round(Number(n.calories) || 0);
            const amount = item.baseUnit ? unitWord(item.baseQuantity, item.baseUnit) : null;
            out.push({
              key, group, item, imageUrl: item.imageUrl, image: item.image, ...extra,
              label: group === "Recent" && amount ? `${item.name} · ${amount}` : item.name,
              sub: group === "Recent" ? `${kcal} kcal · tap to use again` : `${kcal} kcal${amount ? ` for ${amount}` : ""} · instant, no AI needed`,
            });
        };
        if (tracking && quickAdd) {
            for (const f of quickAdd.favorites || []) add("Recent", fromEntry(f), { fav: true, source: f });
            for (const r of quickAdd.recent || []) add("Recent", fromEntry(r), { fav: false, source: r });
        }
        const q = parseFoodQuery(dish).food.trim().toLowerCase();
        if (q.length >= MIN_QUERY) {
            const local = DEFAULT_EXAMPLE.results.filter(r => r.name.toLowerCase().includes(q) || q.split(/\s+/).every(w => r.name.toLowerCase().includes(w.replace(/s$/, ""))));
            for (const item of [...catalog, ...local]) add("Known dishes", item);
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
                    onChange={changeDish}
                    photos={photos}
                    onPhotos={setPhotos}
                    onSubmit={handleSearch}
                    suggestions={suggestions}
                    onPickSuggestion={pickFromDropdown}
                    onToggleFavorite={tracking && quickAdd ? (s) => quickAdd.onToggleFavorite(s.source, s.fav) : undefined}
                />

                {/* 2. Amount: worked out for you; edit it in place */}
                <div className="rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <button type="button" onClick={() => setAmountOpen(o => !o)} aria-expanded={amountOpen}
                    className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Amount</span>
                    <span className="flex items-center gap-2">
                      <b className="text-base text-gray-900 dark:text-white">{portion}</b>
                      {amountOpen
                        ? <ChevronUp size={18} className="text-gray-400" />
                        : <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Change</span>}
                    </span>
                  </button>
                  {amountOpen && (
                    <div className="px-3 pb-3">
                      <PortionPicker quantity={quantity} setQuantity={changeQuantity} unit={unit} setUnit={changeUnit} />
                    </div>
                  )}
                </div>

                {/* 3. Which meal (pre-set from the time of day) */}
                {tracking && (
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
                )}

                {resultsMatchText && (
                    <div className="space-y-2">
                        {note
                          ? <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">{note}</p>
                          : <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{tracking ? "Tap the closest match to add it" : "Tap the closest match"}</p>}
                        {result.map((item, idx) => {
                            const key = `s${idx}`;
                            const selected = pickValid && picked.key === key;
                            const n = nutritionFor(item, quantity, unit);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => choose(item, key)}
                                    aria-pressed={selected}
                                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition active:scale-[0.98] dark:bg-gray-800 ${selected
                                      ? "border-blue-600 ring-2 ring-blue-600"
                                      : "border-gray-200 dark:border-gray-700"}`}
                                >
                                    <img src={`/${item.image}`} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                                        {n ? (
                                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{n.protein ?? 0} g protein</span>
                                            {portion} · C {n.carbs ?? 0}g · F {n.fat ?? 0}g
                                          </span>
                                        ) : (
                                          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Search again for {portion}</span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{n ? n.calories ?? 0 : "–"}</span>
                                        <span className="block text-[10px] text-gray-500">kcal</span>
                                    </span>
                                    {/* Radio-style cue: these cards are choices */}
                                    <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-gray-300 dark:border-gray-600"}`}>
                                        {selected && <Check size={14} strokeWidth={3} />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Action bar: stays at the bottom of the sheet */}
                <div className="sticky bottom-0 -mx-4 mt-auto border-t border-gray-200 bg-gray-50/95 px-4 pb-1 pt-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:-mx-6 sm:px-6">
                    {pickValid ? (
                      <div className="space-y-2">
                        <p className="truncate text-sm text-gray-700 dark:text-gray-200">
                          <b>{portion}</b> of {picked.item.name}
                          <span className="text-gray-500 dark:text-gray-400"> · P {pickedNutrition.protein ?? 0}g · C {pickedNutrition.carbs ?? 0}g · F {pickedNutrition.fat ?? 0}g</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSearch}
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
                            <Plus size={18} /> Add to {MEALS.find(m => m.key === meal)?.label.toLowerCase() ?? "log"} · {pickedNutrition.calories ?? 0} kcal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {picked && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {pickedNutrition ? "You changed the details." : `We don't have ${portion} for this yet.`} Search to update the nutrition.
                          </p>
                        )}
                        {resultsFresh && !isLoading && !picked ? (
                          <button type="button" disabled
                            className="w-full cursor-default rounded-2xl bg-gray-200 px-4 py-3.5 text-base font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            ↑ Pick a match above
                          </button>
                        ) : (
                        <button
                          type="button"
                          onClick={handleSearch}
                          disabled={isLoading || !canSearch || cooldownLeft > 0}
                          className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                        >
                          {isLoading ? (attempt?.n > 1 ? `Still working… (try ${attempt.n} of ${attempt.max})` : LOADING_LINES[loadingLine])
                            : cooldownLeft > 0 ? `Try again in ${cooldownLeft}s`
                            : canSearch ? (
                              <span className="flex flex-col items-center leading-tight">
                                <span>{dishLower ? "✨ Show calories & protein" : "📸 Analyse my plate"}</span>
                                {dishLower && <span className="mt-0.5 max-w-full truncate text-xs font-normal text-blue-100">{portion} · {parseFoodQuery(dish).food.trim()}</span>}
                              </span>
                            )
                            : queryLength > 0 ? "Keep typing…" : "Type a dish or snap a photo"}
                        </button>
                        )}
                      </div>
                    )}
                </div>
            </div>
        </FadeScale>
    )
}
