const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"; 

const notifyInventoryChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("inventory-data-changed"));
  }
};

// src/services/api.ts

const readJsonOrThrow = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
};

export interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  category_id?: number | null;
  isNew?: boolean;
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

export type CategoryFormData = Omit<Category, "id" | "created_at" | "product_count">;

export interface RecycleBinCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  deleted_at?: string;
  recycle_expires_at?: string;
}

export interface RecycleBinProduct {
  id: number;
  name: string;
  description?: string;
  image_path?: string;
  price?: number;
  quantity?: number;
  deleted_at?: string;
  recycle_expires_at?: string;
  deleted_category_id?: number | null;
  deleted_category_name?: string;
}

export interface RecycleBinResponse {
  categories: RecycleBinCategory[];
  products: RecycleBinProduct[];
}



export const api = {
  // Fetch all products
  getProducts: (): Promise<Product[]> =>
    fetch(`${API_BASE_URL}/products`).then((res) => res.json()),

  // Fetch single product
  getProduct: (id: number): Promise<Product> =>
    fetch(`${API_BASE_URL}/products/${id}`).then((res) => res.json()),

  // Create new product
  createProduct: (product: ProductFormData): Promise<Product> =>
    fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }).then((res) => res.json()),

  // Update existing product
  updateProduct: (id: number, product: ProductFormData): Promise<Product> =>
    fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }).then((res) => res.json()),

  // Delete product
  deleteProduct: (id: number): Promise<void> =>
    fetch(`${API_BASE_URL}/products/${id}`, { method: "DELETE" }).then((res) =>
      res.json()
    ),

  // Trigger PDF download in new tab
  downloadPdf: (id: number): void => {
    window.open(`${API_BASE_URL}/products/${id}/pdf`, "_blank");
  },

  // Fetch all categories
  getCategories: (): Promise<Category[]> =>
    fetch(`${API_BASE_URL}/categories`).then((res) => readJsonOrThrow<Category[]>(res, "Failed to fetch categories")),

  // Create new category
  createCategory: (category: CategoryFormData): Promise<Category> =>
    fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    })
      .then((res) => readJsonOrThrow<Category>(res, "Failed to create category"))
      .then((result) => {
        notifyInventoryChanged();
        return result;
      }),

  // Update existing category
  updateCategory: (id: number, category: CategoryFormData): Promise<Category> =>
    fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    })
      .then((res) => readJsonOrThrow<Category>(res, "Failed to update category"))
      .then((result) => {
        notifyInventoryChanged();
        return result;
      }),

  // Delete category
  deleteCategory: (id: number): Promise<void> =>
    fetch(`${API_BASE_URL}/categories/${id}`, { method: "DELETE" }).then((res) =>
      readJsonOrThrow<void>(res, "Failed to delete category")
    ).then((result) => {
      notifyInventoryChanged();
      return result;
    }),

  // Update product stock
  updateStock: (id: number, quantity: number, reason?: string): Promise<Product> =>
    fetch(`${API_BASE_URL}/products/${id}/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, reason }),
    }).then((res) => readJsonOrThrow<Product>(res, "Failed to update stock")),

  // Fetch recycle bin data
  getRecycleBin: (): Promise<RecycleBinResponse> =>
    fetch(`${API_BASE_URL}/recycle-bin`).then((res) =>
      readJsonOrThrow<RecycleBinResponse>(res, "Failed to fetch recycle bin")
    ),

  // Restore a deleted product
  restoreProduct: (id: number): Promise<Product> =>
    fetch(`${API_BASE_URL}/recycle-bin/products/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then((res) => readJsonOrThrow<Product>(res, "Failed to restore product")),

  // Restore a deleted category
  restoreCategory: (id: number): Promise<Category> =>
    fetch(`${API_BASE_URL}/recycle-bin/categories/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => readJsonOrThrow<Category>(res, "Failed to restore category"))
      .then((result) => {
        notifyInventoryChanged();
        return result;
      }),

  // Permanently delete a product from recycle bin
  permanentlyDeleteProduct: (id: number): Promise<void> =>
    fetch(`${API_BASE_URL}/recycle-bin/products/${id}/permanent`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }).then((res) => {
      if (!res.ok) {
        throw new Error("Failed to permanently delete product");
      }
      return res.json();
    }).then(() => {}),
};