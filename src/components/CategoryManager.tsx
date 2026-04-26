import { useEffect, useMemo, useState, type FormEvent } from "react";
import * as categoryStore from "../store/useCategoryStore";
import { api } from "../services/api";
import DeleteWarning from "./DeleteWarning";
import { API_ORIGIN } from "../services/runtimeConfig";

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  icon: string;
};

type Category = {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

type CategoryTarget = {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

type DeleteTarget = {
  id: number;
  name: string;
  productCount: number;
};

type ProductItem = {
  id: number;
  name: string;
  description?: string;
  image_path?: string;
  price?: number;
  quantity?: number;
  category_id?: number | null;
};

const useCategoryStore = (categoryStore as { useCategoryStore: () => {
  categories: CategoryTarget[];
  loading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<Category>;
  updateCategory: (id: number, data: CategoryFormData) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
} }).useCategoryStore;

export default function CategoryManager() {
  const { categories, loading, loadCategories, addCategory, updateCategory, removeCategory } = useCategoryStore();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<CategoryTarget | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    color: "#4ecdc4",
    icon: "package",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    api.getProducts()
      .then((items) => setProducts(Array.isArray(items) ? items : []))
      .catch(() => setProducts([]));
  }, []);

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#4ecdc4", icon: "package" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      if (editingId !== null) {
        await updateCategory(editingId, formData);
      } else {
        await addCategory(formData);
      }

      resetForm();
    } catch (err) {
      console.error("Failed to save category:", err);
      setError("Failed to save category");
    }
  };

  const startEdit = (cat: CategoryTarget) => {
    setFormData({
      name: cat.name || "",
      description: cat.description || "",
      color: cat.color || "#4ecdc4",
      icon: cat.icon || "package",
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await removeCategory(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError("Failed to delete category");
    }
  };

  const isEditPage = showForm && editingId !== null;
  const relatedProducts = selectedCategoryForProducts
    ? products.filter((product) => Number(product.category_id) === selectedCategoryForProducts.id)
    : [];

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const allCategories = categories || [];
    if (!term) return allCategories;

    return allCategories.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  const resolveImageUrl = (imagePath?: string): string => {
    if (!imagePath) return "https://via.placeholder.com/800x450?text=No+Image";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_ORIGIN}/${imagePath}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isEditPage) {
    return (
      <div className="p-4 pt-10 sm:p-6 sm:pt-14 overflow-y-auto h-full">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={resetForm}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500/60 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            aria-label="Back to categories"
            title="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Category</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</span>
              <input
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Category name"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</span>
              <input
                value={formData.icon}
                onChange={(event) => setFormData((current) => ({ ...current, icon: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="package"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</span>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Category description"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</span>
              <input
                type="color"
                value={formData.color}
                onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
              />
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Update Category
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (selectedCategoryForProducts) {
    return (
      <div className="p-4 pt-10 sm:p-6 sm:pt-14 overflow-y-auto h-full">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setSelectedCategoryForProducts(null)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500/60 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            aria-label="Back to categories"
            title="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedCategoryForProducts.name} Related Products
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {relatedProducts.length} product{relatedProducts.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {relatedProducts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
            No related products found for this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {relatedProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="h-48 bg-gray-100 dark:bg-gray-900">
                  <img
                    src={resolveImageUrl(product.image_path)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 line-clamp-3 min-h-[4.5rem]">
                    {product.description || "No description available."}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-base text-gray-600 dark:text-gray-300">
                    <span>Qty {Number(product.quantity || 0)}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      ${Number(product.price || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-6 sm:pt-14 overflow-y-auto h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Category Management</h1>
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search category by name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setError("");
            setShowForm((value) => !value);
            setEditingId(null);
            if (!showForm) {
              setFormData({ name: "", description: "", color: "#4ecdc4", icon: "package" });
            }
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {showForm && editingId === null && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId !== null ? "Edit Category" : "New Category"}
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</span>
              <input
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Category name"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</span>
              <input
                value={formData.icon}
                onChange={(event) => setFormData((current) => ({ ...current, icon: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="package"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</span>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Category description"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</span>
              <input
                type="color"
                value={formData.color}
                onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
              />
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                {editingId !== null ? "Update Category" : "Create Category"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{cat.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description || "No description"}</p>
              </div>
              <div className="h-10 w-10 rounded-full" style={{ backgroundColor: cat.color || "#4ecdc4" }} />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span>Icon</span>
              <span>{cat.icon || "package"}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => startEdit(cat)}
                className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  setDeleteTarget({
                    id: cat.id,
                    name: cat.name,
                    productCount: products.filter((product) => Number(product.category_id) === cat.id).length,
                  })
                }
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Delete
              </button>
            </div>

            <button
              onClick={() => setSelectedCategoryForProducts(cat)}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition font-medium"
            >
              Show Related Products
            </button>
          </div>
        ))}
      </div>

      {!categories.length && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No categories yet.</p>
      )}

      {!!categories.length && !filteredCategories.length && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No categories match your search.</p>
      )}

      <DeleteWarning
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        message={`Are you sure you want to delete category ${deleteTarget?.name || "this category"} and move its ${deleteTarget?.productCount ?? 0} related product(s) to Recycle Bin for 30 days?`}
        onConfirm={handleDelete}
        confirmText="Yes"
        cancelText="No"
      />
    </div>
  );
}
