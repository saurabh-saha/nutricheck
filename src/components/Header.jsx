import { Link } from "react-router-dom";
import ProfileMenu from "../components/ProfileMenu";
import { Menu } from "lucide-react";
import { auth } from "../utils/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Header({ onMenuClick }) {
  const [user] = useAuthState(auth); // ✅ same hook as ProfileMenu

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
              <Menu size={24} />
            </button>

            {/* Logo + Title clickable */}
            <Link
              to={user ? "/track" : "/"}
              className="flex items-center gap-2 hover:opacity-80"
            >
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
