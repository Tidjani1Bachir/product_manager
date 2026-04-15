import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { ProductFormData } from "../services/api"; // ← FIX: import the exact type the API expects
import * as productFormModule from "./ProductForm";
import PdfDownloadButton from "./PdfDownloadButton";
import DeleteWarning from "./DeleteWarning";
import StockBadge from "./StockBadge";
import * as categoryStore from "../store/useCategoryStore";
import * as productStore from "../store/useProductStore";

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  isNew?: boolean;
  quantity?: number;
  low_stock_threshold?: number;
  stock_status?: string;
  category_id?: number | null;
}

interface ProductDetailProps {
  product: Product;
  onSave: (product: Product) => void;
  onDelete: () => void;
  onCancel: () => void;
}

interface ProductFormProps {
  product: Product;
  onSave: (data: Omit<Product, "id">) => Promise<void> | void;
  onCancel: () => void;
}

const useCategoryStore = (categoryStore as { useCategoryStore: () => {
  categories: Array<{ id: number; name: string }>;
  loadCategories: () => Promise<void>;
} }).useCategoryStore;

const useProductStore = (productStore as { useProductStore: () => {
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: number) => void;
  duplicateProduct: (id: number) => Promise<Product>;
  updateStock: (id: number, quantity: number, reason?: string) => Promise<Product | void>;
} }).useProductStore;

const ProductForm = (productFormModule as {
  default: React.ComponentType<ProductFormProps>;
}).default;

// Resolve image URLs from either Cloudinary, local uploads, or a missing value.
const resolveImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://via.placeholder.com/300x300?text=No+Image";
  if (imagePath.startsWith("http")) return imagePath;
  return `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}/${imagePath}`;
};

export default function ProductDetail({ product, onSave, onDelete, onCancel }: ProductDetailProps) {
  const [isEditing, setIsEditing] = useState<boolean>(product.isNew || false);
  const [currentProduct, setCurrentProduct] = useState<Product>(product);
  const [showDeletePopup, setShowDeletePopup] = useState<boolean>(false);
  const { categories, loadCategories } = useCategoryStore();
  const { addProduct, updateProduct, removeProduct, duplicateProduct, updateStock } = useProductStore();

  useEffect(() => {
    setCurrentProduct(product);
    setIsEditing(product.isNew || false);
  }, [product]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSave = async (formData: Omit<Product, "id">) => {
    try {
      let savedProduct: Product;
      if (currentProduct.isNew) {
        // FIX (line 83): Cast to `ProductFormData` — the exact type `api.createProduct` expects —
        // instead of `Record<string, unknown>` which lacks the required `name` property.
        savedProduct = await api.createProduct(formData as ProductFormData);
        // Add to store for real-time update
        addProduct(savedProduct);
      } else {
        // FIX (line 87): Same — `api.updateProduct` expects `ProductFormData`, not a generic record.
        savedProduct = await api.updateProduct(currentProduct.id, formData as ProductFormData);
        // Update store for real-time update
        updateProduct(savedProduct);
      }
      onSave(savedProduct);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  };

  const handleDeleteClick = () => setShowDeletePopup(true);

  const handleConfirmDelete = async () => {
    try {
      await api.deleteProduct(currentProduct.id);
      removeProduct(currentProduct.id);
      setShowDeletePopup(false);
      onDelete();
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleCancelDelete = () => setShowDeletePopup(false);

  const handleDuplicate = async () => {
    try {
      const cloned = await duplicateProduct(currentProduct.id);
      if (cloned) {
        // Add the cloned product to store for real-time update
        addProduct(cloned);
        onSave(cloned);
      }
    } catch (error) {
      console.error("Failed to duplicate product:", error);
    }
  };

  const handleQuickStock = async (delta: number) => {
    try {
      const previousProduct = currentProduct;
      const next = Math.max(0, Number(previousProduct.quantity ?? 0) + delta);
      const reason = delta > 0 ? "Increased stock" : "Decreased stock";

      const optimisticProduct = {
        ...previousProduct,
        quantity: next,
        stock_status: next === 0 ? "out_of_stock" : "in_stock",
      };

      setCurrentProduct(optimisticProduct);
      onSave(optimisticProduct);

      const updated = await updateStock(previousProduct.id, next, reason);
      if (updated) {
        setCurrentProduct(updated);
        // Update store for real-time update
        updateProduct(updated);
        onSave(updated);
      }
    } catch (error) {
      setCurrentProduct(product);
      onSave(product);
      console.error("Failed to update stock:", error);
    }
  };

  const handleStockBadgeClick = async () => {
    try {
      const qty = Number(currentProduct.quantity ?? 0);
      const isOutOfStock = qty === 0;
      const nextQty = isOutOfStock ? 1 : 0;
      const reason = isOutOfStock ? "Toggled to In Stock" : "Toggled to Out of Stock";
      
      // Optimistic update - update UI immediately
      const optimisticProduct = {
        ...currentProduct,
        quantity: nextQty,
        stock_status: nextQty === 0 ? 'out_of_stock' : 'in_stock',
      };
      setCurrentProduct(optimisticProduct);
      onSave(optimisticProduct);
      
      // Sync with server in background
      const updated = await updateStock(currentProduct.id, nextQty, reason);
      if (updated) {
        setCurrentProduct(updated);
        onSave(updated);
      }
    } catch (error) {
      console.error("Failed to toggle stock status:", error);
    }
  };

  const getTechDetails = (): Record<string, unknown> => {
    try {
      return currentProduct.technical_details ? JSON.parse(currentProduct.technical_details) : {};
    } catch {
      return { Details: currentProduct.technical_details || "N/A" };
    }
  };

  const techDetails = getTechDetails();
  const category = categories.find((c) => c.id === currentProduct.category_id);
  const quantity = Number(currentProduct.quantity ?? 0);

  if (isEditing) {
    return (
      <ProductForm
        product={currentProduct}
        onSave={handleSave}
        onCancel={currentProduct.isNew ? onCancel : () => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentProduct.name}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition"
          >
            Edit
          </button>
          <PdfDownloadButton productId={currentProduct.id} productName={currentProduct.name} />
          {!currentProduct.isNew && (
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
            >
              Duplicate
            </button>
          )}
          {!currentProduct.isNew && (
            <button
              onClick={handleDeleteClick}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <img
            src={resolveImageUrl(currentProduct.image_path)}
            alt={currentProduct.name}
            className="w-full h-64 object-contain border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />

          {!currentProduct.isNew && (
            <div className="group relative mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
              <StockBadge
                quantity={quantity}
                showQuantity={false}
                size="lg"
                onClick={handleStockBadgeClick}
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Quantity</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{quantity}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleQuickStock(-1)}
                  disabled={quantity <= 0}
                  className="flex-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                >
                  -1
                </button>
                <button
                  onClick={() => handleQuickStock(1)}
                  className="flex-1 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  +1
                </button>
              </div>

              <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden w-80 max-w-[calc(100vw-2rem)] -translate-y-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block dark:bg-gray-100 dark:text-gray-900">
                Tip: Click Out of Stock to switch the product with a default quantity of 1. Use -1 to reduce quantity and +1 to increase it.
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Product Information</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Price:</span> ${currentProduct.price?.toFixed(2) || "0.00"}</p>
              <p><span className="font-medium">Description:</span> {currentProduct.description || "N/A"}</p>
              <p><span className="font-medium">Category:</span> {category?.name || "Uncategorized"}</p>
              <p><span className="font-medium">Image:</span> {currentProduct.image_path || "N/A"}</p>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Technical Details</h2>
            <div className="space-y-2">
              {Object.entries(techDetails).length > 0 ? (
                Object.entries(techDetails).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-40 text-gray-700 dark:text-gray-300">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">{String(value)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No technical details available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteWarning
        open={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        title="Delete Product"
        message={`Are you sure you want to delete "${currentProduct.name}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
