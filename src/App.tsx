import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import CategoryManager from "./components/CategoryManager";
import TechnicalDetailsManager from "./components/TechnicalDetailsManager.tsx";
import RecycleBin from "./components/RecycleBin";
import ThemeToggle from "./components/ThemeToggle";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case "products":
        return <ProductList />;
      case "categories":
        return <CategoryManager />;
      case "technical-details":
        return <TechnicalDetailsManager />;
      case "recycle-bin":
        return <RecycleBin />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-gray-900">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
      />
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg
              className="h-6 w-6 text-gray-700 dark:text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <ThemeToggle />
        </div>
        {renderPage()}
      </main>
    </div>
  );
}
