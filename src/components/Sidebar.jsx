import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu, Soup, BarChart3, LogIn } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebaseConfig";
import { loginWithGoogle } from "../utils/firebaseLogin";

export default function Sidebar({ isOpen, onClose, collapsed, toggleCollapse }) {
    const location = useLocation();
    const [user] = useAuthState(auth);
  
    const navItems = [
      { path: "/", label: "Calorie Finder", icon: <Soup size={18} />, requiresAuth: false },
      { path: "/track", label: "Nutrition Tracker", icon: <BarChart3 size={18} />, requiresAuth: true }
    ];
  
    return (
      <div
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          ${collapsed ? "w-16" : "w-64"} z-50`}
      >
        {/* Collapse / Expand Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <span className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100">
              <Menu size={20} /> Menu
            </span>
          )}
          <button
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              if (window.innerWidth < 768) {
                onClose();
              } else {
                toggleCollapse();
              }
            }}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
  
        {/* Nav Items */}
        <nav className="mt-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
  
            if (item.requiresAuth && !user) {
              // Show disabled nav item (non-clickable)
              return (
                <div key={item.path} className="space-y-1">
                  <div
                    className={`flex items-center gap-3 px-4 py-2 rounded text-gray-400 cursor-not-allowed select-none
                      ${collapsed ? "justify-center" : ""}
                    `}
                    title="Login required"
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </div>
  
                  {/* Login to Continue clickable prompt */}
                  {!collapsed && (
                    <div
                      onClick={() => {
                        loginWithGoogle();
                        onClose();
                      }}
                      className="flex items-center gap-2 px-4 py-1 rounded cursor-pointer text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
                    >
                      <LogIn size={18} />
                      <span>Login to Continue</span>
                    </div>
                  )}
                </div>
              );
            }
  
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-gray-200 dark:bg-gray-700"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                } text-gray-700 dark:text-gray-300`}
                onClick={onClose}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }
  
