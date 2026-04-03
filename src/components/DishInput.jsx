import { useState, useRef, forwardRef, useEffect, useMemo } from "react"
import { getDishSuggestionsFromGemini } from '../utils/gemini.jsx'
import FadeScale from "./ui/FadeScale";

function FormInput({ value, onChange, placeholder, type = "text", inputRef }) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="border rounded px-3 py-2 flex-1 bg-white text-gray-800 dark:text-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-500"
      />
    )
}

function ServingSizeDropdown({ quantity, setQuantity, unit, setUnit }) {
    const quantities = [0.25, 0.5, ...Array.from({ length: 200 }, (_, i) => i + 1)]
    const units = ['bowl', 'g', 'cup', 'ml', 'piece']
  
    return (
      <>
        <select
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value))}
          className="border rounded px-3 py-2 flex-1 bg-white text-gray-800"
        >
          <option value="">Qty</option>
          {quantities.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
  
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="border rounded px-3 py-2 flex-1 bg-white text-gray-800"
        >
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </>
    )
}

const ImageInput = forwardRef(({ onChange }, ref) => (
  <input
    type="file"
    accept="image/*"
    onChange={(e) => onChange(e.target.files[0])}
    ref={ref}
    className="border rounded px-3 py-2 w-full bg-white text-gray-800 
               focus:border-blue-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
    data-focused={true}
  />
));


export default function DishInput({ 
    onSelect,
    onClose,
    selectedDate,
    setSelectedDate,
    initialDish = "",
    initialQuantity = 1,
    initialUnit = "bowl"
  }) {
    const [dish, setDish] = useState(initialDish);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [unit, setUnit] = useState(initialUnit);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [closing, setClosing] = useState(false);
    const [dishImage, setDishImage] = useState(null);
    const textInputRef = useRef(null);

    useEffect(() => {
      textInputRef.current?.focus();
    }, []);

    const handleSearch = async (searchTerm = dish) => {
        if (!searchTerm.trim() && !dishImage) return;
        setIsLoading(true);
        const suggestions = await getDishSuggestionsFromGemini(searchTerm, quantity, unit, dishImage);
        setIsLoading(false);
    
        if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
            setResult(suggestions);
        }
    };

    // Auto-search on writing
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (dish.length >= 3) {
                handleSearch();
            }
        }, 800);
        return () => clearTimeout(timeout);
    }, [dish]);

    const handleConfirmSelection = (item) => {
        if (item) {
          setClosing(true); // start fade animation
          setTimeout(() => {
            onSelect?.(item.name, quantity, unit, item.nutrition, dishImage, selectedDate);
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
        const currentDay = todayVal.getDay();
        const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(todayVal);
        monday.setDate(todayVal.getDate() - daysToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmt = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        return { minDate: fmt(monday), maxDate: fmt(sunday) };
    }, []);

    return (
        <FadeScale isClosing={closing}>
            <div className="flex flex-col gap-2 w-full max-w-md">
                {/* Dish input */}
                <FormInput
                inputRef={textInputRef}
                value={dish}
                onChange={(e) => setDish(e.target.value)}
                placeholder="Enter a dish (e.g. 2 eggs, oats)..."
                />

                <ImageInput onChange={setDishImage} />
                
                {dishImage && (
                  <div className="flex justify-center mt-2 relative">
                    <img
                      src={URL.createObjectURL(dishImage)}
                      alt="Preview"
                      className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg shadow-md border border-gray-300"
                    />
                    <button
                      onClick={() => setDishImage(null)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                {/* Quantity + Unit + Date */}
                <div className="flex gap-2">
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    min={minDate}
                    max={maxDate}
                    className="border rounded px-3 py-2 flex-1 bg-white text-gray-800"
                />
                <ServingSizeDropdown
                    quantity={quantity}
                    setQuantity={setQuantity}
                    unit={unit}
                    setUnit={setUnit}
                />
                </div>
        
                {/* Button */}
                <button
                    onClick={() => handleSearch()}
                    className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                    disabled={isLoading}
                >
                {isLoading ? 'Searching...' : 'Explore Variations'}
                </button>

                {/* Results List */}
                {Array.isArray(result) && result.length > 0 && (
                    <div className="mt-4 grid gap-3">
                        {result.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-3 border rounded bg-white shadow-sm hover:shadow-md transition cursor-pointer"
                                onClick={() => handleConfirmSelection(item)}
                            >
                                <img
                                    src={`/${item.image}`}
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded"
                                />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                    <p className="text-sm text-gray-500">
                                        {item.nutrition.calories} kcal
                                    </p>
                                </div>
                                <span className="text-green-600 font-bold">Select</span>
                            </div>
                        ))}
                </div>
            )}
            </div>
        </FadeScale>
    )
}
      