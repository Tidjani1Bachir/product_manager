import { useEffect } from "react";
import StockBadge from "./StockBadge";
import { useDashboardStore } from "../store/useDashboardStore";

type DashboardStats = {
  totalProducts: number;
  totalCategories: number;
  totalInventoryValue: number;
  averagePrice: number;
  totalUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  inStockCount: number;
};

type CategoryBreakdown = {
  categoryId: number;
  category: string;
  color: string;
  productCount: number;
  totalStock: number;
  categoryValue: number;
};

type PriceDistribution = {
  priceRange: string;
  count: number;
};

type StockDistribution = {
  status: string;
  count: number;
};

type RecentProduct = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  stock_status: string;
  created_at: string;
};

type LowStockAlert = {
  id: number;
  name: string;
  quantity: number;
  low_stock_threshold: number;
  stock_status: string;
  category_name?: string;
  category_color?: string;
};

type DashboardData = {
  stats: DashboardStats;
  categoryBreakdown: CategoryBreakdown[];
  priceDistribution: PriceDistribution[];
  stockDistribution: StockDistribution[];
  recentProducts: RecentProduct[];
  lowStockAlerts: LowStockAlert[];
};

type ProductLite = {
  id: number;
  category_id?: number | null;
  quantity?: number;
  price?: number;
};

type CategoryLite = {
  id: number;
  name: string;
  color?: string;
};

const COLORS: Record<string, string> = {
  in_stock: "#22c55e",
  low_stock: "#eab308",
  out_of_stock: "#ef4444",
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatStatusLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function Dashboard() {
  const storedData = useDashboardStore((state) => state.data);
  const storedLoading = useDashboardStore((state) => state.loading);
  const storedError = useDashboardStore((state) => state.error);
  const loadDashboard = useDashboardStore((state) => state.loadDashboard);

  const data = storedData;
  const loading = storedLoading && !storedData;
  const error = storedError || "";

  useEffect(() => {
    const handleInventoryDataChanged = () => {
      loadDashboard(true);
    };

    window.addEventListener("inventory-data-changed", handleInventoryDataChanged);

    return () => {
      window.removeEventListener("inventory-data-changed", handleInventoryDataChanged);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || "Dashboard data is unavailable."}</p>
          <button
            onClick={() => setReloadToken((value) => value + 1)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, categoryBreakdown, priceDistribution, stockDistribution, recentProducts, lowStockAlerts } = data;
  const cards = [
    ["Total Products", stats.totalProducts],
    ["Categories", stats.totalCategories],
    ["Total Units", stats.totalUnits],
    ["Inventory Value", currencyFormatter.format(stats.totalInventoryValue || 0)],
  ];

  const categoryMax = Math.max(...(categoryBreakdown || []).map((entry) => Number(entry.productCount || 0)), 1);
  const priceMax = Math.max(...(priceDistribution || []).map((entry) => Number(entry.count || 0)), 1);
  const mergedStockDistribution = (() => {
    const outOfStock = (stockDistribution || [])
      .filter((entry) => entry.status === "out_of_stock")
      .reduce((sum, entry) => sum + Number(entry.count || 0), 0);

    const inStock = (stockDistribution || [])
      .filter((entry) => entry.status !== "out_of_stock")
      .reduce((sum, entry) => sum + Number(entry.count || 0), 0);

    return [
      { status: "out_of_stock", count: outOfStock },
      { status: "in_stock", count: inStock },
    ];
  })();

  const stockTotal = mergedStockDistribution.reduce((sum, entry) => sum + Number(entry.count || 0), 0) || 1;
  const inStockSnapshotCount = Number(stats.inStockCount || 0) + Number(stats.lowStockCount || 0);
  const outOfStockAlerts = (lowStockAlerts || []).filter((alert) => Number(alert.quantity || 0) === 0);

  return (
    <div className="p-4 pt-14 sm:p-6 sm:pt-14 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button
          onClick={() => loadDashboard(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {(categoryBreakdown || []).length > 0 ? (
              categoryBreakdown.map((entry) => (
                <div key={entry.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color || "#6366f1" }} />
                      <span className="font-medium text-gray-900 dark:text-white truncate">{entry.category}</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{entry.productCount} products</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (Number(entry.productCount || 0) / categoryMax) * 100)}%`,
                        backgroundColor: entry.color || "#6366f1",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No category breakdown available.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Status</h3>
          <div className="space-y-4">
            {mergedStockDistribution.length > 0 ? (
              mergedStockDistribution.map((entry) => {
                const width = (Number(entry.count || 0) / stockTotal) * 100;
                return (
                  <div key={entry.status} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">{formatStatusLabel(entry.status)}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{entry.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, width)}%`,
                          backgroundColor: COLORS[entry.status] || "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No stock status data available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Distribution</h3>
          <div className="space-y-4">
            {(priceDistribution || []).length > 0 ? (
              priceDistribution.map((entry) => (
                <div key={entry.priceRange} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900 dark:text-white">{entry.priceRange}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{entry.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${Math.max(4, (Number(entry.count || 0) / priceMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No price distribution data available.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory Snapshot</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Out of Stock", count: stats.outOfStockCount, color: COLORS.out_of_stock },
              { label: "In Stock", count: inStockSnapshotCount, color: COLORS.in_stock },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{item.count}</span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Products</h3>
          <div className="space-y-3">
            {(recentProducts || []).length > 0 ? (
              recentProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{currencyFormatter.format(product.price || 0)}</p>
                  </div>
                  <StockBadge
                    quantity={Number(product.quantity || 0)}
                    size="sm"
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent products available.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Low Stock Alerts</h3>
          <div className="space-y-3">
            {outOfStockAlerts.length > 0 ? (
              outOfStockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{alert.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {alert.category_name || "Uncategorized"} · Qty {Number(alert.quantity || 0)}
                    </p>
                  </div>
                  <StockBadge
                    quantity={Number(alert.quantity || 0)}
                    size="sm"
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No out-of-stock products right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
