import { useState, useEffect } from "react";
import { api } from "../services/api";
import ProductForm from "./ProductForm";
import PdfDownloadButton from "./PdfDownloadButton";
import DeleteWarning from "./DeleteWarning";

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  isNew?: boolean;
}

interface ProductDetailProps {
  product: Product;
  onSave: (product: Product) => void;
  onDelete: () => void;
  onCancel: () => void;
}

// ✅ Helper to resolve image URL (Cloudinary or local)
const resolveImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://via.placeholder.com/300x300?text=No+Image";
  if (imagePath.startsWith("http")) return imagePath; // Cloudinary full URL
  return `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}/${imagePath}`; // local fallback
};

export default function ProductDetail({ product, onSave, onDelete, onCancel }: ProductDetailProps) {
  const [isEditing, setIsEditing] = useState<boolean>(product.isNew || false);
  const [currentProduct, setCurrentProduct] = useState<Product>(product);
  const [showDeletePopup, setShowDeletePopup] = useState<boolean>(false);

  useEffect(() => {
    setCurrentProduct(product);
    setIsEditing(product.isNew || false);
  }, [product]);

  const handleSave = async (formData: Omit<Product, "id">) => {
    try {
      let savedProduct: Product;
      if (product.isNew) {
        savedProduct = await api.createProduct(formData);
      } else {
        savedProduct = await api.updateProduct(product.id, formData);
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
      await api.deleteProduct(product.id);
      setShowDeletePopup(false);
      onDelete();
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleCancelDelete = () => setShowDeletePopup(false);

  const getTechDetails = (): Record<string, unknown> => {
    try {
      return currentProduct.technical_details
        ? JSON.parse(currentProduct.technical_details)
        : {};
    } catch {
      return { Details: currentProduct.technical_details || "N/A" };
    }
  };

  const techDetails = getTechDetails();

  if (isEditing) {
    return <ProductForm product={currentProduct} onSave={handleSave} onCancel={onCancel} />;
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
          <PdfDownloadButton productId={currentProduct.id}
          productName={currentProduct.name}
          />
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
            src={resolveImageUrl(currentProduct.image_path)} // ✅ Cloudinary + local
            alt={currentProduct.name}
            className="w-full h-64 object-contain border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Product Information</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Price:</span> ${currentProduct.price?.toFixed(2) || "0.00"}</p>
              <p><span className="font-medium">Description:</span> {currentProduct.description || "N/A"}</p>
              <p><span className="font-medium">Image:</span> {currentProduct.image_path || "N/A"}</p>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Technical Details</h2>
            <div className="space-y-2">
              {Object.entries(techDetails).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="font-medium w-40 text-gray-700 dark:text-gray-300">
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DeleteWarning
        open={showDeletePopup}
        onClose={setShowDeletePopup}
        title="Delete Product"
        message={`Are you sure you want to delete "${currentProduct.name}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
// ```

// ---

// ## What Changed
// ```
// ImageUpload.tsx:
//   ✅ Added resolveImageUrl() helper
//   ✅ Upload URL uses VITE_API_URL env variable
//   ✅ Image preview works with Cloudinary + local URLs

// ProductDetail.tsx:
//   ✅ Added resolveImageUrl() helper
//   ✅ Image src uses resolveImageUrl()
//   ✅ No more hardcoded localhost:5000