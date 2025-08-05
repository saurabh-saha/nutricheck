import { useState } from "react"
import { getNutritionFromGemini } from '../utils/gemini.jsx'

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
    const units = ['bowl', 'g', 'cup', 'ml']
  
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
    initialDish = "",
    initialQuantity = 1,
    initialUnit = "bowl"
  }) {
    const [dish, setDish] = useState(initialDish);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [unit, setUnit] = useState(initialUnit);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSearch = async () => {
        if (!dish.trim()) return;
        setIsLoading(true);
        const nutrition = await getNutritionFromGemini(dish, quantity, unit);
        setIsLoading(false);
    
        if (nutrition) {
          setResult(nutrition);
        } else {
          alert("❌ Failed to fetch nutrition info");
        }
    };

    const handleConfirmSelection = () => {
        if (result) {
          onSelect?.(dish, quantity, unit, result);
          setDish("");
          setQuantity(1);
          setUnit("bowl");
          setResult(null);
        }
    };

    return (
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

        {/* Result Preview */}
        {result && (
            <div className="border rounded p-3 bg-gray-50 mt-2">
            <h4 className="font-semibold mb-1">Nutrition Preview</h4>
            <pre className="text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
            </pre>
            <button
                onClick={handleConfirmSelection}
                className="bg-green-600 text-white px-4 py-2 rounded w-full mt-2"
            >
                ✅ Confirm & Add
            </button>
            </div>
        )}
      </div>
    )
}
      