const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface Product {
	id: number;
	name: string;
	description?: string;
	price?: number;
	image_path?: string;
	technical_details?: string;
	isNew?: boolean;
	category_id?: number | null;
	quantity?: number;
	low_stock_threshold?: number;
}

export type ProductFormData = Omit<Product, "id" | "isNew">;

export interface Category {
	id: number;
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	created_at?: string;
	product_count?: number;
}

export interface DashboardStats {
	totalProducts: number;
	totalCategories: number;
	totalInventoryValue: number;
	averagePrice: number;
	totalUnits: number;
	outOfStockCount: number;
	lowStockCount: number;
	inStockCount: number;
}

export interface CategoryBreakdown {
	categoryId: number;
	category: string;
	color: string;
	productCount: number;
	totalStock: number;
	categoryValue: number;
}

export interface StockHistoryEntry {
	id: number;
	product_id: number;
	old_quantity: number;
	new_quantity: number;
	change_reason: string;
	changed_at: string;
}

export interface DashboardData {
	stats: DashboardStats;
	categoryBreakdown: CategoryBreakdown[];
	priceDistribution: Array<{ priceRange: string; count: number }>;
	stockDistribution: Array<{ status: string; count: number }>;
	recentProducts: Product[];
	lowStockAlerts: Product[];
}

export const api = {
	getProducts: (): Promise<Product[]> =>
		fetch(`${API_BASE_URL}/products`).then((r) => r.json()),

	getProduct: (id: number): Promise<Product> =>
		fetch(`${API_BASE_URL}/products/${id}`).then((r) => r.json()),

	createProduct: (product: ProductFormData): Promise<Product> =>
		fetch(`${API_BASE_URL}/products`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(product),
		}).then((r) => r.json()),

	updateProduct: (id: number, product: ProductFormData): Promise<Product> =>
		fetch(`${API_BASE_URL}/products/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(product),
		}).then((r) => r.json()),

	deleteProduct: (id: number): Promise<void> =>
		fetch(`${API_BASE_URL}/products/${id}`, { method: "DELETE" }).then(() => undefined),

	downloadPdf: (id: number): void => {
		window.open(`${API_BASE_URL}/products/${id}/pdf`, "_blank");
	},

	duplicateProduct: (id: number): Promise<Product> =>
		fetch(`${API_BASE_URL}/products/${id}/duplicate`, { method: "POST" }).then((r) => {
			if (!r.ok) throw new Error("Failed to duplicate product");
			return r.json();
		}),

	updateStock: (id: number, quantity: number, reason?: string): Promise<Product> =>
		fetch(`${API_BASE_URL}/products/${id}/stock`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ quantity, reason }),
		}).then((r) => {
			if (!r.ok) throw new Error("Failed to update stock");
			return r.json();
		}),

	getStockHistory: (id: number): Promise<StockHistoryEntry[]> =>
		fetch(`${API_BASE_URL}/products/${id}/stock-history`).then((r) => {
			if (!r.ok) throw new Error("Failed to fetch stock history");
			return r.json();
		}),

	getDashboardStats: (): Promise<DashboardData> =>
		fetch(`${API_BASE_URL}/dashboard/stats`).then((r) => {
			if (!r.ok) throw new Error("Failed to fetch dashboard stats");
			return r.json();
		}),

	getCategories: (): Promise<Category[]> =>
		fetch(`${API_BASE_URL}/categories`).then((r) => {
			if (!r.ok) throw new Error("Failed to fetch categories");
			return r.json();
		}),

	createCategory: (category: Partial<Category>): Promise<Category> =>
		fetch(`${API_BASE_URL}/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(category),
		}).then((r) => {
			if (!r.ok) throw new Error("Failed to create category");
			return r.json();
		}),

	updateCategory: (id: number, category: Partial<Category>): Promise<Category> =>
		fetch(`${API_BASE_URL}/categories/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(category),
		}).then((r) => {
			if (!r.ok) throw new Error("Failed to update category");
			return r.json();
		}),

	deleteCategory: (id: number): Promise<{ message: string }> =>
		fetch(`${API_BASE_URL}/categories/${id}`, { method: "DELETE" }).then((r) => {
			if (!r.ok) throw new Error("Failed to delete category");
			return r.json();
		}),
};
