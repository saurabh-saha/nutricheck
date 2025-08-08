import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);     // mobile toggle
  const [collapsed, setCollapsed] = useState(false);   // desktop collapse

  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-sans flex">
      
      {/* Sidebar */}
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        collapsed={collapsed}
        toggleCollapse={() => setCollapsed(prev => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="px-4 py-6 max-w-2xl mx-auto transition-all duration-300">
          
          {/* Header */}
          <Header onMenuClick={() => setMenuOpen(!menuOpen)}/>

          {/* Page Content */}
          <main className="space-y-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="mt-12 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-center text-gray-600 dark:text-gray-400">
            <p>© {new Date().getFullYear()} NutriCheck. Built with 💙</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
