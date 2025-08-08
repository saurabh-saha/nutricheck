import { useDarkModeContext } from "../context/DarkModeContext";
import { Switch } from "../components/ui/switch";
import Layout from '../components/Layout'

export default function Settings() {
  const { isDark, toggle } = useDarkModeContext();
  
  return (
    <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Settings</h1>

            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{isDark ? "🌙" : "☀️"}</span>
                        <Switch checked={isDark} onCheckedChange={toggle} />
                    </div>
                </div>
            </div>
        </div>
    </Layout>
  );
}
