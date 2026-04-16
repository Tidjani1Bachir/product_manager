import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type ProductFormData } from "../services/api";
import DeleteWarning from "./DeleteWarning";
import { useProductStore } from "../store/useProductStore";

type ProductItem = {
  id: number;
  name: string;
  description?: string;
  image_path?: string;
  price?: number;
  quantity?: number;
  category_id?: number | null;
  technical_details?: string;
};

type TechnicalDetailItem = {
  id: string;
  key: string;
  label: string;
  sampleValue: string;
  productIds: number[];
};

type DeleteTarget = {
  id: string;
  label: string;
};

const parseTechnicalDetails = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return { Details: raw };
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
};

const formatDetailLabel = (key: string): string =>
  key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const resolveImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://via.placeholder.com/800x450?text=No+Image";
  if (imagePath.startsWith("http")) return imagePath;
  return `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}/${imagePath}`;
};

export default function TechnicalDetailsManager() {
  const products = useProductStore((state) => state.products) as ProductItem[];
  const storeLoading = useProductStore((state) => state.loading);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TechnicalDetailItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    key: "",
  });

  useEffect(() => {
    if (products.length > 0) {
      setLoading(false);
      return;
    }

    if (storeLoading) {
      return;
    }

    setLoading(true);
    setError("");
    loadProducts().finally(() => setLoading(false));
  }, [loadProducts, products.length, storeLoading]);

  const technicalDetails = useMemo<TechnicalDetailItem[]>(() => {
    const detailMap = new Map<string, TechnicalDetailItem>();

    products.forEach((product) => {
      const details = parseTechnicalDetails(product.technical_details);

      Object.entries(details).forEach(([rawKey, rawValue]) => {
        const key = String(rawKey || "").trim();
        if (!key) return;

        const existing = detailMap.get(key);
        if (existing) {
          if (!existing.productIds.includes(product.id)) {
            existing.productIds.push(product.id);
          }
          return;
        }

        detailMap.set(key, {
          id: key,
          key,
          label: formatDetailLabel(key),
          sampleValue: String(rawValue ?? "N/A"),
          productIds: [product.id],
        });
      });
    });

    return Array.from(detailMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const filteredTechnicalDetails = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return technicalDetails;

    return technicalDetails.filter(
      (detail) => detail.label.toLowerCase().includes(term) || detail.key.toLowerCase().includes(term)
    );
  }, [searchTerm, technicalDetails]);

  const relatedProducts = selectedDetail
    ? products.filter((product) => selectedDetail.productIds.includes(product.id))
    : [];

  const resetEdit = () => {
    setEditingDetailId(null);
    setFormData({ key: "" });
    setError("");
  };

  const startEdit = (detail: TechnicalDetailItem) => {
    setEditingDetailId(detail.id);
    setFormData({ key: detail.key });
    setError("");
  };

  const buildUpdatePayload = (product: ProductItem, technicalDetailsValue: Record<string, unknown>): ProductFormData => ({
    name: product.name,
    description: product.description || "",
    price: Number(product.price || 0),
    image_path: product.image_path || "",
    technical_details: JSON.stringify(technicalDetailsValue),
    category_id: product.category_id ?? null,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDetailId) return;

    const nextKey = formData.key.trim();
    if (!nextKey) {
      setError("Technical detail name is required");
      return;
    }

    if (nextKey !== editingDetailId && technicalDetails.some((detail) => detail.key === nextKey)) {
      setError("A technical detail with this name already exists");
      return;
    }

    const targetProducts = products.filter((product) => {
      const details = parseTechnicalDetails(product.technical_details);
      return Object.prototype.hasOwnProperty.call(details, editingDetailId);
    });

    if (!targetProducts.length) {
      setError("No products found for this technical detail");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await Promise.all(
        targetProducts.map(async (product) => {
          const details = parseTechnicalDetails(product.technical_details);
          const value = details[editingDetailId];
          const nextDetails = { ...details };

          if (nextKey !== editingDetailId) {
            delete nextDetails[editingDetailId];
          }
          nextDetails[nextKey] = value;

          await api.updateProduct(product.id, buildUpdatePayload(product, nextDetails));
        })
      );

      await loadProducts(true);
      resetEdit();
    } catch (err) {
      console.error("Failed to update technical detail:", err);
      setError("Failed to update technical detail");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const targetProducts = products.filter((product) => {
      const details = parseTechnicalDetails(product.technical_details);
      return Object.prototype.hasOwnProperty.call(details, deleteTarget.id);
    });

    setSaving(true);
    setError("");

    try {
      await Promise.all(
        targetProducts.map(async (product) => {
          const details = parseTechnicalDetails(product.technical_details);
          const nextDetails = { ...details };
          delete nextDetails[deleteTarget.id];
          await api.updateProduct(product.id, buildUpdatePayload(product, nextDetails));
        })
      );

      setDeleteTarget(null);
      if (selectedDetail?.id === deleteTarget.id) {
        setSelectedDetail(null);
      }
      await loadProducts(true);
    } catch (err) {
      console.error("Failed to delete technical detail:", err);
      setError("Failed to delete technical detail");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (editingDetailId !== null) {
    return (
      <div className="p-4 pt-14 sm:p-6 sm:pt-14 overflow-y-auto h-full">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={resetEdit}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500/60 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            aria-label="Back to technical details"
            title="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Technical Detail</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 max-w-2xl">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</span>
              <input
                value={formData.key}
                onChange={(event) => setFormData({ key: event.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Technical detail name"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update"}
              </button>
              <button
                type="button"
                onClick={resetEdit}
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

  if (selectedDetail) {
    return (
      <div className="p-4 pt-14 sm:p-6 sm:pt-14 overflow-y-auto h-full">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setSelectedDetail(null)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500/60 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            aria-label="Back to technical details"
            title="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDetail.label} Related Products</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {relatedProducts.length} product{relatedProducts.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {relatedProducts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
            No related products found for this technical detail.
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Technical Details</h1>
        <div className="mt-3 w-full sm:max-w-2xl">
          <input
            type="text"
            placeholder="Search technical detail by name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechnicalDetails.map((detail) => (
          <div
            key={detail.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detail.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  Sample: {detail.sampleValue || "N/A"}
                </p>
              </div>
              <div className="h-10 min-w-10 px-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 inline-flex items-center justify-center text-xs font-semibold">
                {detail.productIds.length}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span>Products</span>
              <span>{detail.productIds.length}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => startEdit(detail)}
                className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget({ id: detail.id, label: detail.label })}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Delete
              </button>
            </div>

            <button
              onClick={() => setSelectedDetail(detail)}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition font-medium"
            >
              Show Related Products
            </button>
          </div>
        ))}
      </div>

      {!technicalDetails.length && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No technical details found.</p>
      )}

      {!!technicalDetails.length && !filteredTechnicalDetails.length && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No technical details match your search.</p>
      )}

      <DeleteWarning
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Technical Detail"
        message={`Are you sure you want to delete ${deleteTarget?.label || "this technical detail"}?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
