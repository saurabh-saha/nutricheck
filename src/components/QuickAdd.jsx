import { Star, Plus } from "lucide-react";
import { favoriteKey } from "../utils/favorites";

function Chip({ item, isFavorite, onAdd, onToggleFavorite, disabled }) {
  const kcal = Math.round(Number(item.nutrition?.calories) || 0);
  return (
    <div className="flex items-stretch rounded-full border border-gray-300 bg-white text-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => onAdd(item)}
        disabled={disabled}
        className="flex items-center gap-1 pl-3 pr-2 py-1.5 text-sm hover:bg-blue-50 disabled:opacity-50 max-w-[14rem]"
        title={`Log ${item.dish}`}
      >
        <Plus size={14} className="shrink-0 text-blue-600" />
        <span className="truncate">{item.dish}</span>
        <span className="shrink-0 text-xs text-gray-500">{kcal} kcal</span>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(item, isFavorite)}
        disabled={disabled}
        aria-label={isFavorite ? `Remove ${item.dish} from favourites` : `Add ${item.dish} to favourites`}
        aria-pressed={isFavorite}
        className="px-2 border-l border-gray-200 hover:bg-yellow-50 disabled:opacity-50"
      >
        <Star size={14} className={isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-400"} />
      </button>
    </div>
  );
}

export default function QuickAdd({ favorites = [], recent = [], onAdd, onToggleFavorite, busy }) {
  const favKeys = new Set(favorites.map((f) => favoriteKey(f.dish)));
  const recentOnly = recent.filter((r) => !favKeys.has(favoriteKey(r.dish)));
  if (!favorites.length && !recentOnly.length) return null;

  return (
    <div className="space-y-2">
      {favorites.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Favourites</p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((item) => (
              <Chip key={favoriteKey(item.dish)} item={item} isFavorite onAdd={onAdd} onToggleFavorite={onToggleFavorite} disabled={busy} />
            ))}
          </div>
        </div>
      )}
      {recentOnly.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recent</p>
          <div className="flex flex-wrap gap-2">
            {recentOnly.map((item) => (
              <Chip key={favoriteKey(item.dish)} item={item} isFavorite={false} onAdd={onAdd} onToggleFavorite={onToggleFavorite} disabled={busy} />
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">Tap to log again, or search for something new below.</p>
    </div>
  );
}
