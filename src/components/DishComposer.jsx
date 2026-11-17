import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus, Sparkles, Star, X, History } from "lucide-react";
import { fuzzyScore } from "../utils/fuzzy";

const MAX_PHOTOS = 3;
const MAX_SUGGESTIONS = 6;
export const MIN_QUERY = 3; // shortest text worth searching (catalogue or AI)

function Thumb({ file, onRemove, label }) {
  // Create and free the preview URL in the same effect, so it stays valid
  // even when React runs effects twice in development.
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="relative h-14 w-14 shrink-0">
      {url && <img src={url} alt={label} className="h-14 w-14 rounded-xl object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-gray-900 text-white ring-2 ring-white dark:ring-gray-900"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/**
 * "What did you eat?"
 * - Typing shows matching recents/favourites (one tap fills the form) and,
 *   last, "Search with AI". Focusing an empty box shows recent foods.
 * - The camera icon adds up to 3 photos; thumbnails appear only once added.
 *
 * suggestions: [{ key, label, kcal, fav, imageUrl }]
 */
export default function DishComposer({
  value, onChange, photos, onPhotos, inputRef, onSubmit,
  suggestions = [], onPickSuggestion, onToggleFavorite,
}) {
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim().toLowerCase();
  const matches = useMemo(() => {
    // Known dishes arrive already matched; your own foods are matched here, forgivingly.
    const list = query
      ? suggestions.filter((s) => s.group === "Known dishes" || fuzzyScore(query, s.item?.name ?? s.label) !== null)
      : suggestions;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [suggestions, query]);
  // Rows: matches, then "Search with AI" when something is typed.
  const rows = [...matches.map((m) => ({ type: "item", item: m })), ...(query.length >= MIN_QUERY ? [{ type: "ai" }] : [])];
  const showList = open && rows.length > 0;

  useEffect(() => setActive(-1), [query]);

  const choose = (row) => {
    setOpen(false);
    inputRef?.current?.blur();
    if (row.type === "ai") onSubmit?.();
    else onPickSuggestion?.(row.item);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && rows.length) { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % rows.length); }
    else if (e.key === "ArrowUp" && rows.length) { e.preventDefault(); setActive((i) => (i <= 0 ? rows.length - 1 : i - 1)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && active >= 0) choose(rows[active]);
      else { setOpen(false); onSubmit?.(); }
    }
  };

  const addFiles = (e) => {
    const picked = [...(e.target.files || [])];
    if (picked.length) onPhotos([...photos, ...picked].slice(0, MAX_PHOTOS));
    e.target.value = ""; // allow choosing the same photo again
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-1 rounded-2xl border-2 border-gray-200 bg-white py-1 pl-4 pr-1 transition-colors focus-within:border-blue-500 dark:border-gray-700 dark:bg-gray-800">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder={photos.length ? "Add a name (optional)" : "What did you eat?"}
            enterKeyHint="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls="food-suggestions"
            aria-autocomplete="list"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
          />
          {value && (
            <button type="button" onClick={() => onChange("")} aria-label="Clear"
              className="grid h-10 w-10 place-items-center rounded-full text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            aria-label="Add a photo of your food"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 active:scale-95 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Camera size={22} />
          </button>
        </div>

        {showList && (
          <ul
            id="food-suggestions"
            role="listbox"
            // Keep focus in the input while tapping a row.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            {rows.map((row, i) => [
              // Section header when the group changes ("Recent", "Known dishes").
              row.type === "item" && row.item.group && row.item.group !== rows[i - 1]?.item?.group && (
                <li key={`h-${row.item.group}`} className="flex items-center gap-1.5 px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {row.item.group === "Recent" ? <History size={12} /> : <Sparkles size={12} />} {row.item.group}
                </li>
              ),
              row.type === "ai" ? (
              <li key="ai" role="option" aria-selected={active === i}>
                <button type="button" onClick={() => choose(row)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-blue-600 dark:text-blue-400 ${active === i ? "bg-blue-50 dark:bg-blue-900/30" : ""} ${matches.length ? "border-t border-gray-100 dark:border-gray-700" : ""}`}>
                  <Sparkles size={18} className="shrink-0" />
                  <span className="truncate">Search “{value.trim()}” with AI</span>
                </button>
              </li>
            ) : (
              <li key={row.item.key} role="option" aria-selected={active === i} className={`flex items-center ${active === i ? "bg-gray-100 dark:bg-gray-700" : ""}`}>
                <button type="button" onClick={() => choose(row)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left">
                  {row.item.imageUrl?.startsWith("data:") || row.item.image
                    ? <img src={row.item.imageUrl?.startsWith("data:") ? row.item.imageUrl : `/${row.item.image}`} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-cover" />
                    : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-700">{row.item.group === "Recent" ? <History size={16} /> : <Sparkles size={16} />}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-gray-900 dark:text-gray-100">{row.item.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{row.item.sub ?? `${row.item.kcal} kcal`}</span>
                  </span>
                </button>
                {onToggleFavorite && row.item.source && (
                  <button type="button" onClick={() => onToggleFavorite(row.item)}
                    aria-label={row.item.fav ? `Remove ${row.item.label} from favourites` : `Add ${row.item.label} to favourites`}
                    aria-pressed={row.item.fav}
                    className="mr-2 grid h-10 w-10 place-items-center rounded-full">
                    <Star size={16} className={row.item.fav ? "fill-blue-500 text-blue-500" : "text-gray-400"} />
                  </button>
                )}
              </li>
            )])}
          </ul>
        )}
      </div>

      {photos.length > 0 && (
        <div className="flex items-center gap-2">
          {photos.map((f, i) => (
            <Thumb key={`${f.name}-${i}`} file={f} label={`photo ${i + 1}`}
              onRemove={() => onPhotos(photos.filter((_, j) => j !== i))} />
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add another photo"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 dark:border-gray-600">
              <Plus size={18} />
            </button>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">{photos.length}/{MAX_PHOTOS} photos</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
    </div>
  );
}
