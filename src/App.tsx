// import { DarkModeProvider, useDarkMode } from "./context/DarkModeContext";
import ProductList from "./components/ProductList";

function AppContent() {
  // const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products Manager</h1>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ProductList />
      </main>
    </div>
  );
}

export default function App() {
  return (
    // <DarkModeProvider>
      <AppContent />
    // </DarkModeProvider>
  );
}