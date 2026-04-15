import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import CategoryManager from "./components/CategoryManager";
import TechnicalDetailsManager from "./components/TechnicalDetailsManager.tsx";
import RecycleBin from "./components/RecycleBin";
import ThemeToggle from "./components/ThemeToggle";
import { useCategoryStore } from "./store/useCategoryStore";
import { useDashboardStore } from "./store/useDashboardStore";
import { useProductStore } from "./store/useProductStore";

type PageId = "dashboard" | "products" | "categories" | "technical-details" | "recycle-bin";

type TourStep = {
  id: string;
  page: PageId;
  target: string;
  title: string;
  purpose: string;
  howTo: string;
};

const ONBOARDING_STORAGE_KEY = "pm.onboarding.completed.v1";

const tourSteps: TourStep[] = [
  {
    id: "dashboard",
    page: "dashboard",
    target: "sidebar-dashboard",
    title: "Dashboard",
    purpose: "Get an instant view of inventory health, stock status, and high-level performance metrics.",
    howTo: "Use this page first each day to monitor totals and trends, then click Refresh to sync the latest numbers.",
  },
  {
    id: "products",
    page: "products",
    target: "sidebar-products",
    title: "Products",
    purpose: "Manage your product catalog, search quickly, and open detailed product records for updates.",
    howTo: "Select an item to edit stock and details, or use Add New Product to create a new entry.",
  },
  {
    id: "categories",
    page: "categories",
    target: "sidebar-categories",
    title: "Categories",
    purpose: "Organize products into logical groups so filtering and reporting remain clean and scalable.",
    howTo: "Create and edit categories here, then review related products inside each category card.",
  },
  {
    id: "technical-details",
    page: "technical-details",
    target: "sidebar-technical-details",
    title: "Technical Detail",
    purpose: "Standardize and maintain the technical attributes attached to products.",
    howTo: "Use this section to rename or remove shared technical fields and inspect where each field is used.",
  },
  {
    id: "recycle-bin",
    page: "recycle-bin",
    target: "sidebar-recycle-bin",
    title: "Recycle Bin",
    purpose: "Safely recover deleted products and categories before they expire permanently.",
    howTo: "Restore items when needed, or delete permanently to keep your dataset clean.",
  },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);

  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const loadDashboard = useDashboardStore((state) => state.loadDashboard);
  const loadProducts = useProductStore((state) => state.loadProducts);

  useEffect(() => {
    loadCategories(true);
    loadDashboard(true);
    loadProducts(true);
  }, [loadCategories, loadDashboard, loadProducts]);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    if (!completed) {
      setShowWelcome(true);
      setSidebarOpen(true);
    }
  }, []);

  const currentTourStep = useMemo(
    () => (tourActive ? tourSteps[tourStepIndex] : null),
    [tourActive, tourStepIndex]
  );

  const markOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  };

  const startTour = () => {
    setShowWelcome(false);
    setTourStepIndex(0);
    setTourActive(true);
    setSidebarOpen(true);
  };

  const endTour = () => {
    setTourActive(false);
    setSpotlightRect(null);
    setTooltipStyle(null);
    markOnboardingComplete();
  };

  const skipWelcome = () => {
    setShowWelcome(false);
    markOnboardingComplete();
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setTourActive(false);
    setTourStepIndex(0);
    setSpotlightRect(null);
    setTooltipStyle(null);
    setCurrentPage("dashboard");
    setSidebarOpen(true);
    setShowWelcome(true);
  };

  const nextStep = () => {
    if (tourStepIndex >= tourSteps.length - 1) {
      endTour();
      return;
    }
    setTourStepIndex((value) => value + 1);
  };

  const previousStep = () => {
    setTourStepIndex((value) => Math.max(0, value - 1));
  };

  useEffect(() => {
    if (!currentTourStep) return;
    setCurrentPage(currentTourStep.page);
    setSidebarOpen(true);
  }, [currentTourStep]);

  useEffect(() => {
    if (!currentTourStep) {
      setSpotlightRect(null);
      setTooltipStyle(null);
      return;
    }

    let frameId = 0;

    const updateSpotlight = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour-target="${currentTourStep.target}"]`);
      if (!target) {
        frameId = window.requestAnimationFrame(updateSpotlight);
        return;
      }

      const rect = target.getBoundingClientRect();
      setSpotlightRect(rect);

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isCompact = viewportWidth < 768;
      const tooltipWidth = Math.max(260, Math.min(420, viewportWidth - 24));

      if (isCompact) {
        setTooltipStyle({
          width: Math.min(tooltipWidth, viewportWidth - 24),
          left: 12,
          bottom: 12,
          top: "auto",
        });
        return;
      }

      const candidateRight = rect.right + 24;
      const canPlaceRight = candidateRight + tooltipWidth <= viewportWidth - 12;
      const candidateLeft = rect.left - tooltipWidth - 24;

      let left = canPlaceRight ? candidateRight : Math.max(12, candidateLeft);
      if (!canPlaceRight && candidateLeft < 12) {
        left = Math.min(viewportWidth - tooltipWidth - 12, Math.max(12, rect.left));
      }

      const preferredTop = rect.top + rect.height / 2 - 150;
      const maxTop = Math.max(12, viewportHeight - 312);
      const top = Math.min(Math.max(12, preferredTop), maxTop);

      setTooltipStyle({
        width: tooltipWidth,
        top,
        left,
      });
    };

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [currentTourStep]);

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
        onNavigate={(page) => setCurrentPage(page as PageId)}
        isOpen={sidebarOpen}
        onStartTour={startTour}
        onResetOnboarding={resetOnboarding}
        forceOpen={tourActive}
      />
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 md:top-4 md:left-4 md:right-auto">
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
          <button
            onClick={startTour}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition text-sm font-medium"
            title="Start guided tour"
          >
            Tutorial
          </button>
          <ThemeToggle />
        </div>
        {renderPage()}
      </main>

      {showWelcome && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
            <div className="p-8 sm:p-10">
              <p className="text-indigo-300 text-sm font-semibold tracking-wide uppercase mb-4">Welcome</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
                Manage products faster with a focused inventory workspace
              </h1>
              <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl">
                Product Manager helps you control stock, organize categories, maintain technical details, and recover deleted items with confidence.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={startTour}
                  className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition transform hover:-translate-y-0.5"
                >
                  Get Started
                </button>
                <button
                  onClick={skipWelcome}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 border border-white/20 transition"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tourActive && currentTourStep && (
        <>
          <div className="fixed inset-0 z-[75] bg-slate-950/65 backdrop-blur-[1px] transition-opacity duration-300" />

          {spotlightRect && (
            <div
              className="fixed z-[76] rounded-xl border-2 border-cyan-300/90 bg-white/5 pointer-events-none transition-all duration-300 ease-out"
              style={{
                top: spotlightRect.top - 6,
                left: spotlightRect.left - 6,
                width: spotlightRect.width + 12,
                height: spotlightRect.height + 12,
                boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.62)",
              }}
            />
          )}

          <div
            className="fixed z-[77] rounded-2xl border border-white/20 bg-slate-900/95 text-white shadow-2xl p-5 sm:p-6 transition-all duration-300"
            style={tooltipStyle || { top: 16, left: 16, right: 16, maxWidth: 420 }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">
                Step {tourStepIndex + 1} of {tourSteps.length}
              </span>
              <button
                onClick={endTour}
                className="text-sm text-slate-300 hover:text-white transition"
              >
                Skip Tour
              </button>
            </div>

            <h2 className="text-xl font-bold mb-2">{currentTourStep.title}</h2>
            <p className="text-slate-200 mb-3 leading-relaxed">{currentTourStep.purpose}</p>
            <p className="text-slate-300 text-sm leading-relaxed">{currentTourStep.howTo}</p>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={previousStep}
                disabled={tourStepIndex === 0}
                className="px-4 py-2 rounded-lg border border-white/25 text-slate-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="px-5 py-2 rounded-lg bg-cyan-400 text-slate-900 font-semibold hover:bg-cyan-300 transition"
              >
                {tourStepIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
