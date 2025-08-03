export default function PreviousSearches({ searches, onClick }) {
  if (!searches?.length) return null

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
        Previous Searches:
      </h3>
      <ul className="space-y-1">
        {searches.slice(0, 5).map((item) => (
          <li key={item}>
            <button
              onClick={() => onClick(item)}
              className="text-sm text-blue-700 dark:text-blue-400 hover:underline focus:outline-none"
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
