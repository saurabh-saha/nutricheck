export default function DishInput({ dish, setDish, handleGenerate, isLoading }) {
    return (
        <div className="flex gap-2 items-center">
        <input
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            placeholder="Enter a dish..."
            className="border rounded px-3 py-2 flex-1"
        />
        <button
            onClick={handleGenerate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={isLoading}
        >
            {isLoading ? 'Loading...' : 'Generate'}
        </button>
        </div>

    )
  }
  