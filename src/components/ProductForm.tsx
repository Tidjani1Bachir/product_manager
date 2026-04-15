import { useState, useEffect } from "react";
import ImageUpload from "./ImageUpload";
import ImageUploadNew from "./ImageUploadNew";
import { useCategoryStore } from "../store/useCategoryStore";

interface Product {
  id?: number;
  name?: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  category_id?: number | null;
  isNew?: boolean;
}

interface FormData {
  name: string;
  description: string;
  technical_details: Record<string, string>;
  image_path: string;
  price: number;
  category_name: string;
}

import { type ProductFormData } from "../services/api";

interface ProductFormProps {
  product: Product;
  onSave: (formData: ProductFormData) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const { categories, loadCategories, addCategory } = useCategoryStore();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    technical_details: {},
    image_path: "",
    price: 0,
    category_name: "",
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
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (product && !product.isNew) {
      const matchedCategory = categories.find((item) => item.id === product.category_id);
      setFormData({
        name: product.name || "",
        description: product.description || "",
        technical_details: parseTechDetails(product.technical_details),
        image_path: product.image_path || "",
        price: product.price || 0,
        category_name: matchedCategory?.name || "",
      });
      setImagePath(product.image_path || "");
    }
  }, [categories, product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "price"
          ? parseFloat(value) || 0
          : name === "category_id"
            ? (value === "" ? null : Number(value))
            : value,
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

    const submit = async () => {
      const normalizedCategory = formData.category_name.trim();
      let resolvedCategoryId: number | null = null;

      if (normalizedCategory) {
        const existingCategory = categories.find(
          (item) => item.name.trim().toLowerCase() === normalizedCategory.toLowerCase()
        );

        if (existingCategory) {
          resolvedCategoryId = existingCategory.id;
        } else {
          const created = await addCategory({
            name: normalizedCategory,
            description: `${normalizedCategory} related products`,
            color: "#6366f1",
            icon: normalizedCategory,
          });
          resolvedCategoryId = created.id;
        }
      }

      onSave({
        name: formData.name,
        description: formData.description,
        technical_details: JSON.stringify(formData.technical_details),
        image_path: formData.image_path,
        price: formData.price,
        category_id: resolvedCategoryId,
      });
    };

    submit().catch((error) => {
      console.error("Failed to save product category:", error);
      alert(error instanceof Error ? error.message : "Failed to save category");
    });
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 overflow-y-auto p-4 sm:p-8 md:p-12 w-full h-full z-50">
      <div className="max-w-3xl mx-auto ">
        <div className="mb-8 flex items-center gap-0 ">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Return"
            className="-ml-6 mr-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:-ml-8"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {product.isNew ? "Add New Product" : "Edit Product"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category_name"
              list="category-suggestions"
              value={formData.category_name}
              onChange={handleChange}
              placeholder="Type a category name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="category-suggestions">
              {categories.map((category) => (
                <option key={category.id} value={category.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Image
            </label>
            {product.isNew ? (
              <ImageUploadNew onUpload={handleImageUpload} initialImage={imagePath} disabled={false} />
            ) : (
              <ImageUpload onUpload={handleImageUpload} initialImage={imagePath} disabled={false} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Technical Details
            </label>
            <div className="space-y-4">
              {Object.entries(formData.technical_details).map(([key, value]) => (
                <div key={key} className="flex gap-3">
                  <input
                    type="text"
                    defaultValue={key}
                    onBlur={(e) => {
                      const newKey = e.target.value.trim();
                      if (newKey && newKey !== key) {
                        const newTech = { ...formData.technical_details };
                        const value = newTech[key];
                        delete newTech[key];
                        newTech[newKey] = value;
                        setFormData((prev) => ({ ...prev, technical_details: newTech }));
                      }
                    }}
                    className="w-40 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name={key}
                    value={value}
                    onChange={handleTechChange}
                    placeholder="Value"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeTechField(key)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900/70 dark:text-red-200 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <input
                  type="text"
                  id="new-tech-key"
                  placeholder="New property name"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              {product.isNew ? "Create Product" : "Update Product"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 rounded-lg transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
