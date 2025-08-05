import { Link } from 'react-router-dom'
import { Switch } from "../components/ui/switch"
import ProfileMenu from "../components/ProfileMenu"

export default function Header({ isDark, toggle }) {
  return (
    <header className="mb-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Top Row: Logo + Profile */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🥗</span>
            <h1 className="text-3xl font-bold">NutriCheck</h1>
          </div>
          <ProfileMenu />
        </div>

        {/* Bottom Row: Navigation + Dark Mode */}
        <div className="flex justify-between items-center">
          <nav className="flex gap-4 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Link to="/" className="hover:underline">Calorie Finder</Link>
            <Link to="/track" className="hover:underline">Tracker</Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </span>
            <Switch checked={isDark} onCheckedChange={toggle} />
          </div>
        </div>

      </div>
    </header>
  )
}
