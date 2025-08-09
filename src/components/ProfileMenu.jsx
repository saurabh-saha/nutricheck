import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { loginWithGoogle, logout } from "../utils/firebaseLogin";
import { auth } from "../utils/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user] = useAuthState(auth); // from react-firebase-hooks

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
                <li>
                  <Link
                    to="/settings"
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setOpen(false)}
                  >Settings
                  </Link>
                </li>
                <li
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Logout
                </li>
              </>
            ) : (
              <li
                onClick={() => {
                  loginWithGoogle();
                  setOpen(false);
                  navigate("/");
                }}
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
