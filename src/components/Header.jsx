import { Link } from "react-router-dom";
import ProfileMenu from "../components/ProfileMenu";

export default function Header({ onMenuClick }) {
  return (
    <header className="mb-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Top Row: Menu + Logo + Profile */}
        <div className="flex justify-between items-center">

          {/* Left: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onMenuClick}
            >
              ☰
            </button>

            {/* Logo + Title clickable */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-3xl">🥗</span>
              <h1 className="text-3xl font-bold">NutriCheck</h1>
            </Link>
          </div>

          {/* Right: Profile Menu */}
          <ProfileMenu />
        </div>

      </div>
    </header>
  );
}
