import { Link } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'
import { Switch } from "../components/ui/switch"

export default function Layout({ children }) {
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-sans">
      
      {/* Container wrapper with consistent padding */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="mb-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-2">

            {/* Logo and Title */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🥗</span>
              <h1 className="text-3xl font-bold">NutriCheck</h1>
            </div>

            <div className="flex items-center gap-2 self-end">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </span>
              <Switch checked={isDark} onCheckedChange={toggle} />
            </div>

            {/* Navigation */}
            <nav className="flex gap-4 text-blue-600 dark:text-blue-400 text-sm font-medium">
              <Link to="/" className="hover:underline">Calorie Finder</Link>
              <Link to="/track" className="hover:underline">Tracker</Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t pt-4 text-sm text-center text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
          <Link
            to="/track"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 mb-1"
          >
            <span>➡️</span> <span>Go to Nutrition Tracker</span>
          </Link>
          <p>© {new Date().getFullYear()} NutriCheck. Built with 💙</p>
        </footer>

      </div>
    </div>
  )
}
