import { useEffect, useMemo, useState } from "react";
//MdAccessTime
import { MdProductionQuantityLimits, MdCategory, MdWarehouse, MdAttachMoney, MdBarChart, MdAutoAwesome, MdWarning } from "react-icons/md";
// import StockBadge from "./StockBadge";
import { useDashboardStore } from "../store/useDashboardStore";

type TimePeriod = "monthly" | "quarterly";

type CategoryPeriodRow = {
  key: string;
  periodLabel: string;
  categoryId: number;
  category: string;
  color: string;
  productCount: number;
  totalStock: number;
  categoryValue: number;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTER_LABELS = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];

const COLORS: Record<string, string> = {
  in_stock: "#22c55e",
  low_stock: "#eab308",
  out_of_stock: "#ef4444",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatStatusLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("monthly");
  const storedData = useDashboardStore((state) => state.data);
  const storedLoading = useDashboardStore((state) => state.loading);
  const storedError = useDashboardStore((state) => state.error);
  const loadDashboard = useDashboardStore((state) => state.loadDashboard);

  const data = storedData;
  const loading = storedLoading && !storedData;
  const error = storedError || "";

  useEffect(() => {
    loadDashboard(true);

    const handleInventoryDataChanged = () => {
      loadDashboard(true);
    };

    const handleWindowFocus = () => {
      loadDashboard(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboard(true);
      }
    };

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard(true);
      }
    }, 10000);

    window.addEventListener("inventory-data-changed", handleInventoryDataChanged);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("inventory-data-changed", handleInventoryDataChanged);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, [loadDashboard]);

  const stats = useMemo(() => data?.stats || {
    totalProducts: 0,
    totalCategories: 0,
    totalInventoryValue: 0,
    averagePrice: 0,
    totalUnits: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    inStockCount: 0,
  }, [data]);
  const categoryBreakdown = useMemo(() => data?.categoryBreakdown || [], [data]);
  const categoryTimeSeries = useMemo(() => data?.categoryTimeSeries || [], [data]);
  const priceDistribution = useMemo(() => data?.priceDistribution || [], [data]);
  const stockDistribution = useMemo(() => data?.stockDistribution || [], [data]);
  const lowStockAlerts = useMemo(() => data?.lowStockAlerts || [], [data]);
  
  const summaryCards = [
    { label: "Total Products", value: stats.totalProducts, icon: MdProductionQuantityLimits, bgColor: "bg-blue-50 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "Categories", value: stats.totalCategories, icon: MdCategory, bgColor: "bg-purple-50 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
    { label: "Total Units", value: stats.totalUnits, icon: MdWarehouse, bgColor: "bg-green-50 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
    { label: "Inventory Value", value: currencyFormatter.format(stats.totalInventoryValue || 0), icon: MdAttachMoney, bgColor: "bg-orange-50 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400" },
  ];

  const categoryMax = Math.max(...categoryBreakdown.map((entry) => Number(entry.productCount || 0)), 1);
  const priceMax = Math.max(...priceDistribution.map((entry) => Number(entry.count || 0)), 1);
  const mergedStockDistribution = (() => {
    const outOfStock = stockDistribution
      .filter((entry) => entry.status === "out_of_stock")
      .reduce((sum, entry) => sum + Number(entry.count || 0), 0);

    const inStock = stockDistribution
      .filter((entry) => entry.status !== "out_of_stock")
      .reduce((sum, entry) => sum + Number(entry.count || 0), 0);

    return [
      { status: "out_of_stock", count: outOfStock },
      { status: "in_stock", count: inStock },
    ];
  })();

  const stockTotal = mergedStockDistribution.reduce((sum, entry) => sum + Number(entry.count || 0), 0) || 1;
  const inStockSnapshotCount = Number(stats.inStockCount || 0) + Number(stats.lowStockCount || 0);
  const outOfStockAlerts = lowStockAlerts.filter((alert) => Number(alert.quantity || 0) === 0);
  const periodRows = useMemo<CategoryPeriodRow[]>(() => {
    const monthlyRowsFromApi = categoryTimeSeries.map((entry) => ({
      key: `${entry.year}-${entry.month}-${entry.categoryId}`,
      periodLabel: `${MONTH_NAMES[Math.max(0, Math.min(11, Number(entry.month || 1) - 1))]} ${entry.year}`,
      categoryId: Number(entry.categoryId || 0),
      category: entry.category || "Uncategorized",
      color: entry.color || "#6366f1",
      productCount: Number(entry.productCount || 0),
      totalStock: Number(entry.totalStock || 0),
      categoryValue: Number(entry.categoryValue || 0),
    }));

    const monthlyRows = monthlyRowsFromApi.length > 0
      ? monthlyRowsFromApi
      : categoryBreakdown.map((entry) => ({
          key: `current-${entry.categoryId}`,
          periodLabel: "Current Month",
          categoryId: Number(entry.categoryId || 0),
          category: entry.category || "Uncategorized",
          color: entry.color || "#6366f1",
          productCount: Number(entry.productCount || 0),
          totalStock: Number(entry.totalStock || 0),
          categoryValue: Number(entry.categoryValue || 0),
        }));

    if (selectedPeriod === "monthly") {
      return monthlyRows;
    }

    const aggregated = monthlyRows.reduce<Record<string, CategoryPeriodRow>>((acc, row) => {
      const monthFromLabel = MONTH_NAMES.findIndex((month) => row.periodLabel.startsWith(month));
      const month = monthFromLabel >= 0 ? monthFromLabel + 1 : 1;
      const yearMatch = row.periodLabel.match(/(\d{4})/);
      const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
      const quarter = Math.floor((month - 1) / 3) + 1;
      const bucketKey = `${year}-Q${quarter}-${row.categoryId}`;

      if (!acc[bucketKey]) {
        acc[bucketKey] = {
          key: bucketKey,
          periodLabel: `${QUARTER_LABELS[quarter - 1]} ${year}`,
          categoryId: row.categoryId,
          category: row.category,
          color: row.color,
          productCount: 0,
          totalStock: 0,
          categoryValue: 0,
        };
      }

      acc[bucketKey].productCount += Number(row.productCount || 0);
      acc[bucketKey].totalStock += Number(row.totalStock || 0);
      acc[bucketKey].categoryValue += Number(row.categoryValue || 0);
      return acc;
    }, {});

    return Object.values(aggregated);
  }, [categoryBreakdown, categoryTimeSeries, selectedPeriod]);

  const periodStockMax = Math.max(...periodRows.map((entry) => Number(entry.totalStock || 0)), 1);
  const periodHeaderLabel = selectedPeriod === "monthly" ? "Monthly" : "Quarterly";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-300 dark:border-slate-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-white dark:bg-slate-950">
        <div className="text-center max-w-md">
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error || "Dashboard data is unavailable."}</p>
          <button
            onClick={() => loadDashboard(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-6 sm:pt-14 space-y-6 overflow-y-auto h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Monitor your inventory and sales at a glance</p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition font-semibold border border-slate-300 dark:border-slate-500 shadow-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map(({ label, value, icon: Icon, bgColor, iconColor }) => (
          <div key={label} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition hover:border-slate-300 dark:hover:border-slate-600/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{String(value)}</p>
              </div>
              <div className={`${bgColor} h-14 w-14 rounded-xl flex items-center justify-center`}>
                <Icon className={`${iconColor} h-7 w-7`} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <div className="flex items-center gap-2 mb-5">
            <MdBarChart className="h-5 w-5 text-gray-700 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">Distribution of products across primary verticals</p>
          <div className="space-y-5">
            {(categoryBreakdown || []).length > 0 ? (
              categoryBreakdown.map((entry) => (
                <div key={entry.categoryId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color || "#6366f1" }} />
                      <span className="font-medium text-gray-900 dark:text-slate-100 text-sm">{entry.category}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">{entry.productCount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, (Number(entry.productCount || 0) / categoryMax) * 100)}%`,
                        backgroundColor: entry.color || "#6366f1",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">No category breakdown available.</p>
            )}
          </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <div className="flex items-center gap-2 mb-5">
            <MdAutoAwesome className="h-5 w-5 text-gray-700 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Status</h3>
            <span className="ml-auto inline-block px-2 py-1 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded text-xs font-semibold text-green-600 dark:text-green-400">LIVE UPDATES</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">Real-time availability tracking</p>
          <div className="space-y-5">
            {mergedStockDistribution.length > 0 ? (
              mergedStockDistribution.map((entry) => {
                const width = (Number(entry.count || 0) / stockTotal) * 100;
                const isOutOfStock = entry.status === "out_of_stock";
                return (
                  <div key={entry.status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full`}
                          style={{ backgroundColor: COLORS[entry.status] || "#6366f1" }}
                        />
                        <span className={`font-medium text-sm ${isOutOfStock ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {formatStatusLabel(entry.status)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{entry.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(5, width)}%`,
                          backgroundColor: COLORS[entry.status] || "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">No stock status data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Price Distribution</h3>
          <div className="space-y-5">
            {(priceDistribution || []).length > 0 ? (
              priceDistribution.map((entry) => (
                <div key={entry.priceRange}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-slate-100 text-sm">{entry.priceRange}</span>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">{entry.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-500 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.max(5, (Number(entry.count || 0) / priceMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">No price distribution data available.</p>
            )}
          </div>
        </div>

        {/* Inventory Snapshot */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Inventory Snapshot</h3>
          <div className="space-y-4">
            {[
              { label: "In Stock", count: inStockSnapshotCount, color: COLORS.in_stock, percentage: Math.round((inStockSnapshotCount / (inStockSnapshotCount + stats.outOfStockCount || 1)) * 100) },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-3">{item.label}</p>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="relative w-24 h-24">
                      <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#d1d5db" strokeWidth="8" className="dark:stroke-slate-700/50" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="8"
                          strokeDasharray={`${(item.percentage / 100) * 282.6} 282.6`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{item.count}</span>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Units in stock</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Items Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution (Alternative Layout) */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Distribution</h3>
            <MdBarChart className="h-5 w-5 text-gray-600 dark:text-slate-400" />
          </div>
          <div className="space-y-5">
            {(priceDistribution || []).length > 0 ? (
              priceDistribution.map((entry) => (
                <div key={`alt-${entry.priceRange}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900 dark:text-slate-100 text-sm uppercase tracking-wide">{entry.priceRange}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-slate-100">{entry.count} UNITS</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-500 dark:from-blue-500 to-slate-400 dark:to-blue-400 transition-all duration-300"
                      style={{ width: `${Math.max(5, (Number(entry.count || 0) / priceMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">No price distribution data available.</p>
            )}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Critical Alerts</h3>
            <span className="inline-block px-2 py-1 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded text-xs font-semibold text-red-600 dark:text-red-400">LOW STOCK</span>
          </div>
          <div className="space-y-3">
            {outOfStockAlerts.length > 0 ? (
              outOfStockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-red-100/90 dark:bg-red-900/25 border border-red-300 dark:border-red-500/35 p-4 hover:border-red-400 dark:hover:border-red-500/60 transition"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-red-200 dark:bg-red-900/40 flex items-center justify-center shrink-0 border border-red-300 dark:border-red-500/40">
                      <span className="text-slate-800 dark:text-red-100 text-sm">📦</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-red-50 text-sm">{alert.name}</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-red-100/90 mt-1">
                        {Number(alert.quantity || 0)} remaining · {alert.category_name || "Uncategorized"}
                      </p>
                    </div>
                  </div>
                  <MdWarning className="h-5 w-5 text-red-700 dark:text-red-300 shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">No out-of-stock products right now.</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm dark:shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod("quarterly")}
              className={`text-xs font-medium transition pb-1 ${
                selectedPeriod === "quarterly"
                  ? "text-gray-900 dark:text-white border-b border-blue-500"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setSelectedPeriod("monthly")}
              className={`text-xs font-medium transition pb-1 ${
                selectedPeriod === "monthly"
                  ? "text-gray-900 dark:text-white border-b border-blue-500"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Category / Period</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Current Stock ({periodHeaderLabel})</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Valuation ({periodHeaderLabel})</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Usage Index ({periodHeaderLabel})</th>
              </tr>
            </thead>
            <tbody>
              {periodRows.length > 0 ? (
                periodRows.map((entry) => (
                  <tr key={entry.key} className="group border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-400 dark:hover:bg-slate-700/70 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || "#6366f1" }} />
                        <span className="text-sm text-gray-900 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white">{entry.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">{entry.periodLabel}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{entry.totalStock}</td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{currencyFormatter.format(Number(entry.categoryValue || 0))}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.max(5, (Number(entry.totalStock || 0) / periodStockMax) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">{Math.round((Number(entry.totalStock || 0) / periodStockMax) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-center text-gray-600 dark:text-slate-400">
                    No category breakdown available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
