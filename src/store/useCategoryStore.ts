import { create } from "zustand";
import { api, type Category as ApiCategory } from "../services/api";

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at?: string;
  product_count?: number;
}

export type CategoryFormData = Omit<Category, "id">;

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  loadCategories: (force?: boolean) => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<Category>;
  updateCategory: (id: number, data: CategoryFormData) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  loadCategories: async (force = false) => {
    if (!force && get().categories.length > 0) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const raw = await api.getCategories();
      const data: Category[] = Array.isArray(raw) ? raw : [];
      set({ categories: data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load categories";
      set({ error: message, loading: false });
    }
  },

  addCategory: async (data: CategoryFormData) => {
    try {
      const created: ApiCategory = await api.createCategory(data);
      set((state) => ({
        categories: [...state.categories, created].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        ),
      }));
      return created;
    } catch (error) {
      console.error("Failed to add category:", error);
      throw error;
    }
  },

  updateCategory: async (id: number, data: CategoryFormData) => {
    try {
      const updated: ApiCategory = await api.updateCategory(id, data);
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? updated : c
        ).sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      }));
    } catch (error) {
      console.error("Failed to update category:", error);
      throw error;
    }
  },

  removeCategory: async (id: number) => {
    try {
      await api.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete category:", error);
      throw error;
    }
  },
}));
