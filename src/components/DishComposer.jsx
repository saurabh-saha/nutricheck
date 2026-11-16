import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, Search, X } from "lucide-react";

const MAX_PHOTOS = 3;

function PhotoSlot({ file, onRemove, onAdd, label }) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  if (file) {
    return (
      <div className="relative h-16 w-16 shrink-0">
        <img src={url} alt={label} className="h-16 w-16 rounded-xl object-cover" />
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
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${label}`}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition active:scale-95 dark:border-gray-600 dark:text-gray-500"
    >
      <ImagePlus size={20} />
    </button>
  );
}

// "What did you eat?": a search box, with up to 3 photos of the meal underneath.
export default function DishComposer({ value, onChange, photos, onPhotos, inputRef, onSubmit, submitDisabled }) {
  const fileRef = useRef(null);

  const addFiles = (e) => {
    const picked = [...(e.target.files || [])];
    if (picked.length) onPhotos([...photos, ...picked].slice(0, MAX_PHOTOS));
    e.target.value = ""; // allow choosing the same photo again
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-blue-500 dark:border-gray-700 dark:bg-gray-800">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit?.(); } }}
          placeholder={photos.length ? "Add a name (optional)" : "What did you eat?"}
          enterKeyHint="search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-label="Search"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition active:scale-95 disabled:opacity-40"
        >
          <Search size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: MAX_PHOTOS }, (_, i) => (
          <PhotoSlot
            key={i}
            file={photos[i]}
            label={`photo ${i + 1}`}
            onAdd={() => fileRef.current?.click()}
            onRemove={() => onPhotos(photos.filter((_, j) => j !== i))}
          />
        ))}
        <p className="ml-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
          Up to {MAX_PHOTOS} photos of your plate. Take one or pick from your gallery.
        </p>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
      </div>
    </div>
  );
}
