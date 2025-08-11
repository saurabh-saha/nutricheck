import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithGoogle, logout } from "../utils/firebaseLogin";
import { auth } from "../utils/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  // Force default dark theme
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout(); // wait for Firebase to sign out
    navigate("/");  // then redirect
  };

  const handleLogin = async () => {
    setOpen(false);
    await loginWithGoogle();
    navigate("/track");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg font-semibold"
      >
        👤
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-md z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            {user ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">Not logged in</p>
            )}
          </div>

          <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
            {user ? (
              <>
                <li>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                </li>
                <li
                  onClick={handleLogout}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Logout
                </li>
              </>
            ) : (
              <li
                onClick={handleLogin}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                Login with Google
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
