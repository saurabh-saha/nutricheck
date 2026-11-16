import { useEffect, useMemo, useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

// One input for "what did you eat?": type it, snap it with the camera, or pick a photo.
export default function DishComposer({ value, onChange, image, onImage, inputRef, onSubmit, autoFocus }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (file) onImage(file);
    e.target.value = ""; // allow picking the same photo again
  };

  return (
    <div className="space-y-1.5">
      <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 shadow-sm focus-within:shadow-md transition-shadow">
        <div className="flex items-center gap-2 rounded-[14px] bg-white px-2 py-1.5">
          {preview ? (
            <div className="relative shrink-0">
              <img src={preview} alt="Your food" className="h-11 w-11 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => onImage(null)}
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gray-900 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="pl-1 text-xl" aria-hidden>🍽️</span>
          )}

          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit?.(); } }}
            placeholder={image ? "Add a name (optional)" : "What did you eat?"}
            enterKeyHint="search"
            autoComplete="off"
            autoFocus={autoFocus}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            aria-label="Take a photo"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-900 text-white active:scale-95 transition"
          >
            <Camera size={20} />
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            aria-label="Choose a photo"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-700 active:scale-95 transition"
          >
            <ImagePlus size={20} />
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
          <input ref={galleryRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>
      </div>
      <p className="px-1 text-xs text-gray-500 dark:text-gray-400">
        Type a dish like <i>2 idli with sambar</i>, or snap a photo 📸
      </p>
    </div>
  );
}
