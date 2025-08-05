import { Link } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'
import Header from '../components/Header'

export default function Layout({ children }) {
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <Header isDark={isDark} toggle={toggle} />

        {/* Main Content */}
        <main className="space-y-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-center text-gray-600 dark:text-gray-400">
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
