import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="h-dvh bg-white text-gray-800 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-sans flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        collapsed={collapsed}
        toggleCollapse={() => setCollapsed(prev => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        
        {/* Header */}
        <Header onMenuClick={() => setMenuOpen(!menuOpen)} />

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full transition-all duration-300 space-y-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="pt-4 pb-4 border-t border-gray-200 dark:border-gray-700 text-sm text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} NutriCheck. Built with 💙</p>
          <p className="mt-1 px-4 text-xs">
            Nutrition values are AI-generated estimates for general information only and are not medical advice.
            Talk to a doctor or registered dietitian before making health decisions.
          </p>
        </footer>

      </div>
    </div>
  );
}

