import { Star, Utensils } from "lucide-react";
import { favoriteKey } from "../utils/favorites";
import { cleanDishLabel } from "../utils/units";

function Card({ item, isFavorite, selected, onPick, onToggleFavorite, disabled }) {
  const kcal = Math.round(Number(item.nutrition?.calories) || 0);
  const label = cleanDishLabel(item.dish);
  return (
    <div className="relative w-36 shrink-0 snap-start">
      <button
        type="button"
        onClick={() => onPick(item)}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`Use ${label}, ${kcal} kcal`}
        className={`flex h-full w-full flex-col rounded-2xl border bg-white p-2.5 text-left transition active:scale-95 disabled:opacity-50 dark:bg-gray-800 ${
          selected ? "border-blue-600 ring-2 ring-blue-600" : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {item.imageUrl?.startsWith("data:") ? (
          <img src={item.imageUrl} alt="" className="mb-2 h-14 w-full rounded-xl object-cover" />
        ) : (
          <div className="mb-2 grid h-14 w-full place-items-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500" aria-hidden>
            <Utensils size={20} />
          </div>
        )}
        <span className="line-clamp-2 text-sm font-medium leading-tight text-gray-900 dark:text-gray-100">{label}</span>
        <span className="mt-auto pt-2 text-xs text-gray-500 dark:text-gray-400">{kcal} kcal</span>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(item, isFavorite)}
        disabled={disabled}
        aria-label={isFavorite ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
        aria-pressed={isFavorite}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 dark:bg-gray-900/80"
      >
        <Star size={16} className={isFavorite ? "fill-blue-500 text-blue-500" : "text-gray-400"} />
      </button>
    </div>
  );
}

// "Recents": starred foods first, then recently logged ones, in one swipeable row.
// Picking a card fills the form so it can be adjusted before adding.
export default function QuickAdd({ favorites = [], recent = [], onPick, onToggleFavorite, selectedKey, busy }) {
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
    <section aria-label="Recents" className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Recents</h3>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {items.map(({ item, fav }) => {
          const key = favoriteKey(cleanDishLabel(item.dish));
          return (
            <Card key={key} item={item} isFavorite={fav} selected={key === selectedKey}
              onPick={onPick} onToggleFavorite={onToggleFavorite} disabled={busy} />
          );
        })}
      </div>
    </section>
  );
}
