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
          <option value="">Unit</option>
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </>
    )
}
  

export default function DishInput({ 
    dish,
    setDish,
    quantity,
    setQuantity,
    unit,
    setUnit,
    handleGenerate,
    isLoading
  }) {
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
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Generate'}
        </button>
      </div>
    )
}
      