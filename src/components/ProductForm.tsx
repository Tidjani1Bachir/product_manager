import { useState, useEffect } from "react";
import ImageUpload from "./ImageUpload";
import ImageUploadNew from "./ImageUploadNew";

interface Product {
  id?: number;
  name?: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  isNew?: boolean;
}

interface FormData {
  name: string;
  description: string;
  technical_details: Record<string, string>;
  image_path: string;
  price: number;
}

import { type ProductFormData } from "../services/api";

interface ProductFormProps {
  product: Product;
  onSave: (formData: ProductFormData) => void;  // ✅ uses string, not Record
  onCancel: () => void;
}

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    technical_details: {},
    image_path: "",
    price: 0,
  });

  const [imagePath, setImagePath] = useState<string>(product.image_path || "");

  const parseTechDetails = (techStr?: string): Record<string, string> => {
    try {
      return techStr ? JSON.parse(techStr) : {};
    } catch {
      return { Details: techStr || "" };
    }
  };

  useEffect(() => {
    if (product && !product.isNew) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        technical_details: parseTechDetails(product.technical_details),
        image_path: product.image_path || "",
        price: product.price || 0,
      });
      setImagePath(product.image_path || "");
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageUpload = (path: string) => {
    setImagePath(path);
    setFormData((prev) => ({ ...prev, image_path: path }));
  };

  const handleTechChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      technical_details: { ...prev.technical_details, [name]: value },
    }));
  };

  const addTechField = (key: string) => {
    if (key && !(key in formData.technical_details)) {
      setFormData((prev) => ({
        ...prev,
        technical_details: { ...prev.technical_details, [key]: "" },
      }));
    }
  };

  const removeTechField = (key: string) => {
    const newTech = { ...formData.technical_details };
    delete newTech[key];
    setFormData((prev) => ({ ...prev, technical_details: newTech }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!formData.name.trim()) {
    alert("Product name is required");
    return;
  }
  // Serialize technical_details before passing up
  onSave({
    ...formData,
    technical_details: JSON.stringify(formData.technical_details),
  });
};

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 overflow-y-auto p-4 sm:p-6 w-full h-full">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {product.isNew ? "Add New Product" : "Edit Product"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Image
          </label>
          {product.isNew ? (
            <ImageUploadNew onUpload={handleImageUpload} initialImage={imagePath} disabled={false} />
          ) : (
            <ImageUpload onUpload={handleImageUpload} initialImage={imagePath} disabled={false} />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Technical Details
          </label>
          <div className="space-y-3">
            {Object.entries(formData.technical_details).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
                <input
                  type="text"
                  name={key}
                  value={value}
                  onChange={handleTechChange}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => removeTechField(key)}
                  className="px-3 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900/70 dark:text-red-200 rounded transition"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                id="new-tech-key"
                placeholder="New property name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const key = (e.target as HTMLInputElement).value.trim();
                    if (key) {
                      addTechField(key);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("new-tech-key") as HTMLInputElement;
                  const key = input.value.trim();
                  if (key) {
                    addTechField(key);
                    input.value = "";
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            {product.isNew ? "Create Product" : "Update Product"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}