import { create } from "zustand";
import { API_BASE_URL } from "../services/runtimeConfig";

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

export type CategoryTimeSeriesEntry = {
  year: number;
  month: number;
  monthLabel: string;
  categoryId: number;
  category: string;
  color: string;
  productCount: number;
  totalStock: number;
  categoryValue: number;
};

export type DashboardData = {
  stats: DashboardStats;
  categoryBreakdown: CategoryBreakdown[];
  categoryTimeSeries?: CategoryTimeSeriesEntry[];
  priceDistribution: PriceDistribution[];
  stockDistribution: StockDistribution[];
  recentProducts: RecentProduct[];
  lowStockAlerts: LowStockAlert[];
};

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  loadDashboard: (force?: boolean) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  loading: false,
  error: null,

  loadDashboard: async (force = false) => {
    const state = get();
    if (state.loading) {
      return;
    }

    if (!force && state.data) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }
      const data: DashboardData = await response.json();

      const hasExistingData = Boolean(get().data);
      const isFallbackPayload =
        (data.stats?.totalProducts ?? 0) === 0 &&
        (data.categoryBreakdown?.length ?? 0) === 0 &&
        (data.priceDistribution?.length ?? 0) === 0 &&
        (data.stockDistribution?.length ?? 0) === 0 &&
        (data.recentProducts?.length ?? 0) === 0;

      if (hasExistingData && isFallbackPayload) {
        set({ loading: false, error: null });
        return;
      }

      set({ data, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data";
      const hasExistingData = Boolean(get().data);
      set({
        loading: false,
        error: hasExistingData ? null : message,
      });
    }
  },
}));
