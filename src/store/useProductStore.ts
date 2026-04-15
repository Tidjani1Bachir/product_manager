import { create } from "zustand";
import { api, Product, ProductFormData } from "../services/api";

type StoreProduct = Product & {
  category_id?: number | null;
  quantity?: number;
  low_stock_threshold?: number;
  stock_status?: string;
};

interface ProductState {
  products: StoreProduct[];
  selectedProduct: StoreProduct | null;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  categoryFilter: number | null;
  stockFilter: string | null;

  // Actions
  loadProducts: (force?: boolean) => Promise<void>;
  setSelectedProduct: (product: StoreProduct | null) => void;
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (categoryId: number | null) => void;
  setStockFilter: (status: string | null) => void;
  addProduct: (product: StoreProduct) => void;
  updateProduct: (product: StoreProduct) => void;
  removeProduct: (id: number) => void;
  duplicateProduct: (id: number) => Promise<StoreProduct>;
  updateStock: (id: number, quantity: number, reason: string) => Promise<void>;
  filteredProducts: () => StoreProduct[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedProduct: null,
  loading: true,
  error: null,
  searchTerm: "",
  categoryFilter: null,
  stockFilter: null,

  loadProducts: async (force = false) => {
    if (!force && get().products.length > 0) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const raw = await api.getProducts();
      const data: StoreProduct[] = Array.isArray(raw) ? raw : [];
      set({ products: data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load products";
      set({ error: message, loading: false });
    }
  },

  setSelectedProduct: (product) => set({ selectedProduct: product }),

  setSearchTerm: (term) => set({ searchTerm: term }),

  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId }),

  setStockFilter: (status) => set({ stockFilter: status }),

  addProduct: (product) =>
    set((state) => ({
      products: [product, ...state.products.filter((p) => p.id !== product.id)],
    })),

  updateProduct: (product) =>
    set((state) => ({
      products: state.products.some((p) => p.id === product.id)
        ? state.products.map((p) => (p.id === product.id ? product : p))
        : [...state.products, product],
    })),

  removeProduct: (id) =>
    set((state) => {
      const remaining = state.products.filter((p) => p.id !== id);
      return {
        products: remaining,
        selectedProduct:
          state.selectedProduct?.id === id
            ? remaining.length > 0
              ? remaining[0]
              : null
            : state.selectedProduct,
      };
    }),

  duplicateProduct: async (id) => {
    try {
      const original = get().products.find((p) => p.id === id);
      if (!original) throw new Error("Product not found");

      const duplicateData: ProductFormData = {
        name: `${original.name} (Copy)`,
        description: original.description || "",
        price: original.price || 0,
        image_path: original.image_path || "",
        technical_details: original.technical_details || "",
      };

      const cloned = await api.createProduct(duplicateData);
      // Add the cloned product to the store
      get().addProduct(cloned as StoreProduct);
      return cloned as StoreProduct;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to duplicate product";
      set({ error: message });
      throw error;
    }
  },

  updateStock: async (id, quantity, reason) => {
    try {
      const updated = await api.updateStock(id, quantity, reason);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? (updated as StoreProduct) : p)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update stock";
      set({ error: message });
      throw error;
    }
  },

  filteredProducts: () => {
    const { products, searchTerm, categoryFilter, stockFilter } = get();
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        Object.values(p).join(" ").toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== null) {
      filtered = filtered.filter((p) => p.category_id === categoryFilter);
    }

    if (stockFilter) {
      filtered = filtered.filter((p) => {
        const qty = Number(p.quantity || 0);
        const th = Number(p.low_stock_threshold || 5);
        if (stockFilter === "out_of_stock") return qty === 0;
        if (stockFilter === "low_stock") return qty > 0 && qty <= th;
        if (stockFilter === "in_stock") return qty > th;
        return true;
      });
    }

    return filtered;
  },
}));
