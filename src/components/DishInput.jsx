import { useState } from "react"
import { getDishSuggestionsFromGemini } from '../utils/gemini.jsx'
import FadeScale from "./ui/FadeScale";

function FormInput({ value, onChange, placeholder, type = "text" }) {
    return (
      <input
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
  

export default function DishInput({ 
    onSelect,
    onClose,
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

    const handleSearch = async () => {
        if (!dish.trim()) return;
        setIsLoading(true);
        const suggestions = await getDishSuggestionsFromGemini(dish, quantity, unit);
        setIsLoading(false);
    
        if (suggestions.error) {
            alert(`⚠️ Gemini API Error: ${suggestions.error}`);
        } else if (Array.isArray(suggestions) && suggestions.length > 0) {
            setResult(suggestions);
        } else {
        alert("❌ No suggestions found");
        }
    };

    const handleConfirmSelection = (item) => {
        if (item) {
          setClosing(true); // start fade animation
          setTimeout(() => {
            onSelect?.(item.name, quantity, unit, item.nutrition);
            setDish("");
            setQuantity(1);
            setUnit("bowl");
            setResult(null);
            setClosing(false);
            onClose?.();
          }, 300);
        }
      };

    return (
        <FadeScale isClosing={closing}>
            <div className="flex flex-col gap-2 w-full max-w-md">
                {/* Dish input */}
                <FormInput
                value={dish}
                onChange={(e) => setDish(e.target.value)}
                placeholder="Enter a dish..."
                />
        
                {/* Quantity + Unit */}
                <div className="flex gap-2">
                <ServingSizeDropdown
                    quantity={quantity}
                    setQuantity={setQuantity}
                    unit={unit}
                    setUnit={setUnit}
                />
                </div>
        
                {/* Button */}
                <button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                    disabled={isLoading}
                >
                {isLoading ? 'Loading...' : 'Generate'}
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
                                    src={item.image}
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
      