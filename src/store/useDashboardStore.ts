import { create } from "zustand";

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

export type DashboardData = {
  stats: DashboardStats;
  categoryBreakdown: CategoryBreakdown[];
  priceDistribution: PriceDistribution[];
  stockDistribution: StockDistribution[];
  recentProducts: RecentProduct[];
  lowStockAlerts: LowStockAlert[];
};

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  loadDashboard: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  loadDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }
      const data: DashboardData = await response.json();
      set({ data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data";
      set({ error: message, loading: false });
    }
  },
}));
