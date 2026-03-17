// src/services/api.ts

export interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  isNew?: boolean;
}

export type ProductFormData = Omit<Product, "id" | "isNew">;

const API_BASE_URL = "http://localhost:5000/api";

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
};