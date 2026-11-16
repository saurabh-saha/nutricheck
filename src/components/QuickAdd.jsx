import { Star, Plus } from "lucide-react";
import { favoriteKey } from "../utils/favorites";
import { cleanDishLabel } from "../utils/units";

function Card({ item, isFavorite, onAdd, onToggleFavorite, disabled }) {
  const kcal = Math.round(Number(item.nutrition?.calories) || 0);
  const label = cleanDishLabel(item.dish);
  return (
    <div className="relative w-36 shrink-0 snap-start">
      <button
        type="button"
        onClick={() => onAdd(item)}
        disabled={disabled}
        aria-label={`Add ${label} again, ${kcal} kcal`}
        className="flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        {item.imageUrl?.startsWith("data:") ? (
          <img src={item.imageUrl} alt="" className="mb-2 h-14 w-full rounded-xl object-cover" />
        ) : (
          <div className="mb-2 grid h-14 w-full place-items-center rounded-xl bg-gradient-to-br from-emerald-50 to-sky-100 text-2xl" aria-hidden>🍽️</div>
        )}
        <span className="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{label}</span>
        <span className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">{kcal} kcal</span>
          <span className="flex items-center gap-0.5 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
            <Plus size={12} /> Add
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(item, isFavorite)}
        disabled={disabled}
        aria-label={isFavorite ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
        aria-pressed={isFavorite}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm"
      >
        <Star size={16} className={isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-400"} />
      </button>
    </div>
  );
}

// "Log again": favourites first, then recent foods, in one swipeable row.
// Tapping a card adds the same food, portion and nutrition as last time
// to the meal and date chosen above. No search needed.
export default function QuickAdd({ favorites = [], recent = [], onAdd, onToggleFavorite, busy }) {
  const favKeys = new Set(favorites.map((f) => favoriteKey(cleanDishLabel(f.dish))));
  const seen = new Set();
  const items = [
    ...favorites.map((f) => ({ item: f, fav: true })),
    ...recent.map((r) => ({ item: r, fav: false })),
  ].filter(({ item, fav }) => {
    const key = favoriteKey(cleanDishLabel(item.dish));
    if (seen.has(key) || (!fav && favKeys.has(key))) return false;
    seen.add(key);
    return true;
  });
  if (!items.length) return null;

  return (
    <section aria-label="Log again" className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Log again</h3>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {items.map(({ item, fav }) => (
          <Card key={favoriteKey(cleanDishLabel(item.dish))} item={item} isFavorite={fav}
            onAdd={onAdd} onToggleFavorite={onToggleFavorite} disabled={busy} />
        ))}
      </div>
    </section>
  );
}
