export default function NutritionResult({ result }) {
  if (!result) return null

  return (
    <div className="mt-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Nutrition Info</h3>
      <ul className="space-y-1 text-sm">
        {Object.entries(result).map(([key, value]) => (
          <li key={key}>
            <span className="font-medium">{key}:</span> {value}
          </li>
        ))}
      </ul>
    </div>
  )
}
