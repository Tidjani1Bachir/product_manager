import { useEffect, useMemo, useState } from "react";
import { api, type RecycleBinCategory, type RecycleBinProduct } from "../services/api";
import { useProductStore } from "../store/useProductStore";

type RecycleBinData = {
  categories: RecycleBinCategory[];
  products: RecycleBinProduct[];
};

interface RecycleBinItem {
  id: number;
  name: string;
  deletedAt?: string | Date | null;
}

const sortRecycleBinItems = <T extends RecycleBinItem>(items: T[]): T[] =>
  [...items].sort((firstItem, secondItem) => {
    const firstTime = firstItem.deletedAt
      ? typeof firstItem.deletedAt === "string"
        ? Date.parse(firstItem.deletedAt)
        : firstItem.deletedAt.getTime()
      : 0;
    const secondTime = secondItem.deletedAt
      ? typeof secondItem.deletedAt === "string"
        ? Date.parse(secondItem.deletedAt)
        : secondItem.deletedAt.getTime()
      : 0;

    return secondTime - firstTime;
  });

const withDeletedAt = <T extends { deleted_at?: string | null }>(items: T[]) =>
  items.map((item) => ({
    ...item,
    deletedAt: item.deleted_at || null,
  }));

const getTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

let recycleBinCache: RecycleBinData | null = null;
let recycleBinCacheError = "";

const formatDate = (value?: string): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getDaysLeft = (value?: string): number => {
  if (!value) return 0;
  const expires = new Date(value).getTime();
  const now = Date.now();
  const diff = expires - now;
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function RecycleBin() {
  const [loading, setLoading] = useState(() => !recycleBinCache);
  const [error, setError] = useState(() => recycleBinCacheError);
  const [data, setData] = useState<RecycleBinData>(() => recycleBinCache ?? { categories: [], products: [] });
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { addProduct, loadProducts } = useProductStore();

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true;
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm);
  };

  const loadRecycleBin = async (force = false) => {
    if (!force && recycleBinCache) {
      setData(recycleBinCache);
      setError(recycleBinCacheError);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.getRecycleBin();
      const nextData = {
        categories: Array.isArray(result.categories) ? result.categories : [],
        products: Array.isArray(result.products) ? result.products : [],
      };
      recycleBinCache = nextData;
      recycleBinCacheError = "";
      setData(nextData);
    } catch (err) {
      console.error("Failed to load recycle bin:", err);
      recycleBinCache = { categories: [], products: [] };
      recycleBinCacheError = "Failed to load recycle bin data";
      setError(recycleBinCacheError);
      setData(recycleBinCache);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreProduct = async (productId: number) => {
    try {
      setRestoring(`product-${productId}`);
      const restoredProduct = await api.restoreProduct(productId);

      // Immediately reflect restore in the Products page.
      addProduct(restoredProduct);
      
      // Reload products list in the store
      await loadProducts();
      
      // Remove restored product from data
      setData((prev) => {
        const next = {
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        };
        recycleBinCache = next;
        return next;
      });
      
      setError("");
      recycleBinCacheError = "";
    } catch (err) {
      console.error("Failed to restore product:", err);
      setError(`Failed to restore product: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentlyDeleteProduct = async (productId: number) => {
    try {
      console.log(`Starting permanent deletion of product ${productId}`);
      setDeleting(`product-${productId}`);
      await api.permanentlyDeleteProduct(productId);
      
      console.log(`Successfully deleted product ${productId}`);
      // Remove permanently deleted product from data
      setData((prev) => {
        const next = {
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        };
        recycleBinCache = next;
        return next;
      });
      
      setError("");
      recycleBinCacheError = "";
    } catch (err) {
      console.error("Failed to permanently delete product:", err);
      setError(`Failed to permanently delete product: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleRestoreCategory = async (categoryId: number) => {
    try {
      setRestoring(`category-${categoryId}`);
      await api.restoreCategory(categoryId);

      // Category restore can bring back related products as well.
      await loadProducts();
      
      // Remove restored category and its products from data
      setData((prev) => {
        const next = {
          ...prev,
          categories: prev.categories.filter((c) => c.id !== categoryId),
          products: prev.products.filter((p) => Number(p.deleted_category_id) !== categoryId),
        };
        recycleBinCache = next;
        return next;
      });
      
      setError("");
      recycleBinCacheError = "";
    } catch (err) {
      console.error("Failed to restore category:", err);
      setError(`Failed to restore category: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRestoring(null);
    }
  };

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const productsByCategory = useMemo(() => {
    const map = new Map<number, RecycleBinProduct[]>();
    data.products.forEach((product) => {
      const rawCategoryId = product.deleted_category_id;
      if (rawCategoryId === null || rawCategoryId === undefined) {
        return;
      }
      const categoryId = Number(rawCategoryId);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return;
      }
      if (!map.has(categoryId)) {
        map.set(categoryId, []);
      }
      map.get(categoryId)?.push(product);
    });
    return map;
  }, [data.products]);

  const deletedCategoryIds = useMemo(
    () => new Set(data.categories.map((category) => Number(category.id))),
    [data.categories]
  );

  const sortedCategories = useMemo(
    () => sortRecycleBinItems(withDeletedAt(data.categories)),
    [data.categories]
  );

  const extraCategoryGroups = useMemo(() => {
    const groups: Array<{ id: number; name: string; products: RecycleBinProduct[] }> = [];
    productsByCategory.forEach((products, categoryId) => {
      if (deletedCategoryIds.has(categoryId)) {
        return;
      }
      groups.push({
        id: categoryId,
        name: products[0]?.deleted_category_name || `Category ${categoryId}`,
        products,
      });
    });
    return groups;
  }, [deletedCategoryIds, productsByCategory]);

  const sortedExtraCategoryGroups = useMemo(
    () =>
      [...extraCategoryGroups].sort((firstGroup, secondGroup) => {
        const firstTime = Date.parse(firstGroup.products[0]?.deleted_at || "");
        const secondTime = Date.parse(secondGroup.products[0]?.deleted_at || "");
        return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime);
      }),
    [extraCategoryGroups]
  );

  const uncategorizedProducts = useMemo(
    () => {
      return data.products.filter((product) => {
        const rawCategoryId = product.deleted_category_id;
        if (rawCategoryId === null || rawCategoryId === undefined) {
          return true;
        }
        const categoryId = Number(rawCategoryId);
        return !Number.isFinite(categoryId) || categoryId <= 0;
      });
    },
    [data.products]
  );

  const sortedUncategorizedProducts = useMemo(
    () => sortRecycleBinItems(withDeletedAt(uncategorizedProducts)),
    [uncategorizedProducts]
  );

  const recycleBinSections = useMemo(() => {
    const categorySections = sortedCategories.map((category) => {
      const relatedProducts = sortRecycleBinItems(withDeletedAt(productsByCategory.get(category.id) || []));
      const latestProductTime = relatedProducts.reduce((latest, product) => {
        const nextTime = getTimestamp(product.deleted_at);
        return Math.max(latest, nextTime);
      }, 0);

      return {
        kind: "category" as const,
        id: `category-${category.id}`,
        sortTime: Math.max(getTimestamp(category.deleted_at), latestProductTime),
        category,
        relatedProducts,
      };
    });

    const extraSections = sortedExtraCategoryGroups.map((group) => {
      const latestProductTime = group.products.reduce((latest, product) => {
        const nextTime = getTimestamp(product.deleted_at);
        return Math.max(latest, nextTime);
      }, 0);

      return {
        kind: "group" as const,
        id: `group-${group.id}`,
        sortTime: latestProductTime,
        group,
      };
    });

    const uncategorizedSection = sortedUncategorizedProducts.length > 0
      ? [
          {
            kind: "uncategorized" as const,
            id: "uncategorized",
            sortTime: sortedUncategorizedProducts.reduce((latest, product) => Math.max(latest, getTimestamp(product.deleted_at)), 0),
            products: sortedUncategorizedProducts,
          },
        ]
      : [];

    return [...categorySections, ...extraSections, ...uncategorizedSection].sort(
      (firstSection, secondSection) => secondSection.sortTime - firstSection.sortTime
    );
  }, [sortedCategories, productsByCategory, sortedExtraCategoryGroups, sortedUncategorizedProducts]);

  const filteredRecycleBinSections = useMemo(() => {
    if (!normalizedSearchTerm) {
      return recycleBinSections;
    }

    return recycleBinSections
      .map((section) => {
        if (section.kind === "category") {
          const categoryMatches = matchesSearch([
            section.category.name,
            section.category.description,
            section.category.deleted_at,
            section.category.recycle_expires_at,
          ]);
          const filteredProducts = categoryMatches
            ? section.relatedProducts
            : section.relatedProducts.filter((product) =>
                matchesSearch([
                  product.name,
                  product.price,
                  product.quantity,
                  product.deleted_at,
                  product.recycle_expires_at,
                  product.description,
                  product.technical_details,
                ])
              );

          return filteredProducts.length > 0 || categoryMatches
            ? { ...section, relatedProducts: filteredProducts }
            : null;
        }

        if (section.kind === "group") {
          const groupMatches = matchesSearch([section.group.name]);
          const filteredProducts = groupMatches
            ? section.group.products
            : section.group.products.filter((product) =>
                matchesSearch([
                  product.name,
                  product.price,
                  product.quantity,
                  product.deleted_at,
                  product.recycle_expires_at,
                  product.description,
                  product.technical_details,
                ])
              );

          return filteredProducts.length > 0 || groupMatches
            ? { ...section, group: { ...section.group, products: filteredProducts } }
            : null;
        }

        const filteredProducts = section.products.filter((product) =>
          matchesSearch([
            product.name,
            product.price,
            product.quantity,
            product.deleted_at,
            product.recycle_expires_at,
            product.description,
            product.technical_details,
          ])
        );

        return filteredProducts.length > 0 ? { ...section, products: filteredProducts } : null;
      })
      .filter(Boolean);
  }, [matchesSearch, normalizedSearchTerm, recycleBinSections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-10 sm:p-6 sm:pt-14 overflow-y-auto h-full">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recycle Bin</h1>
          <div className="relative mt-3 group w-full">
            <input
              type="text"
              placeholder="Search deleted categories or products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
              <div className="mb-2 text-gray-100">Search deleted items using any visible detail.</div>
              🔍 You can search by:
              <ul className="list-disc list-inside mt-1 space-y-1 text-gray-200">
                <li>Category name or description</li>
                <li>Product name, price, or details</li>
              </ul>
            </div>
          </div>
        </div>
        <button
          onClick={() => loadRecycleBin(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!filteredRecycleBinSections.length ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          {normalizedSearchTerm ? "No matching recycle bin items found." : "Recycle bin is empty."}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecycleBinSections.map((section) => {
            if (section.kind === "category") {
              const { category, relatedProducts } = section;
              const daysLeft = getDaysLeft(category.recycle_expires_at);

              return (
                <div
                  key={section.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{category.description || "No description"}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:text-right">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Deleted: {formatDate(category.deleted_at)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Expires: {formatDate(category.recycle_expires_at)}</p>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">{daysLeft} day(s) left</p>
                      </div>
                      <button
                        onClick={() => handleRestoreCategory(category.id)}
                        disabled={restoring === `category-${category.id}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white transition text-sm font-medium"
                      >
                        {restoring === `category-${category.id}` ? "Restoring..." : "Restore"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Deleted products ({relatedProducts.length})
                    </div>
                    {relatedProducts.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No products found.</p>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {relatedProducts.map((product) => (
                          <div key={product.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Qty {Number(product.quantity || 0)} • ${Number(product.price || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Deleted: {formatDate(product.deleted_at)}</p>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                  {getDaysLeft(product.recycle_expires_at)} day(s) left
                                </p>
                              </div>
                              <button
                                onClick={() => handleRestoreProduct(product.id)}
                                disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                              >
                                {restoring === `product-${product.id}` ? "Restoring..." : "Restore"}
                              </button>
                              <button
                                onClick={() => handlePermanentlyDeleteProduct(product.id)}
                                disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                                className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                              >
                                {deleting === `product-${product.id}` ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (section.kind === "group") {
              return (
                <div
                  key={section.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.group.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Related deleted products</p>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Deleted products ({section.group.products.length})
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {section.group.products.map((product) => (
                        <div key={product.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Qty {Number(product.quantity || 0)} • ${Number(product.price || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Deleted: {formatDate(product.deleted_at)}</p>
                              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                {getDaysLeft(product.recycle_expires_at)} day(s) left
                              </p>
                            </div>
                            <button
                              onClick={() => handleRestoreProduct(product.id)}
                              disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                            >
                              {restoring === `product-${product.id}` ? "Restoring..." : "Restore"}
                            </button>
                            <button
                              onClick={() => handlePermanentlyDeleteProduct(product.id)}
                              disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                            >
                              {deleting === `product-${product.id}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Category</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Products deleted individually from Products page</p>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deleted products ({section.products.length})
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {section.products.map((product) => (
                      <div key={product.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Qty {Number(product.quantity || 0)} • ${Number(product.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Deleted: {formatDate(product.deleted_at)}</p>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {getDaysLeft(product.recycle_expires_at)} day(s) left
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestoreProduct(product.id)}
                            disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                          >
                            {restoring === `product-${product.id}` ? "Restoring..." : "Restore"}
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeleteProduct(product.id)}
                            disabled={restoring === `product-${product.id}` || deleting === `product-${product.id}`}
                            className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white transition text-xs font-medium whitespace-nowrap"
                          >
                            {deleting === `product-${product.id}` ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
