import { useState, useEffect } from "react";
import { useProductStore } from "../store/useProductStore";
import { useThemeStore } from "../store/useThemeStore";
import ProductDetail from "./ProductDetail";

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_path?: string;
  technical_details?: string;
  isNew?: boolean;
}

export default function ProductList() {
  // Subscribe to product store
  const storeProducts = useProductStore((state) => state.products);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const isDark = useThemeStore((state) => state.isDark);

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [showFirstProductTip, setShowFirstProductTip] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load products on mount
  useEffect(() => {
    loadProducts().finally(() => setLoading(false));
  }, [loadProducts]);

  // Update local products when store updates (e.g., after restore)
  useEffect(() => {
    setProducts(storeProducts);
    if (storeProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(storeProducts[0]);
    }
  }, [storeProducts, selectedProduct]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = products.filter((p) =>
      Object.values(p).join(" ").toLowerCase().includes(term)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    if (isMobile) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div
        className={`${
          isMobile ? (selectedProduct ? "hidden" : "block w-full") : "w-1/3"
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto`}
      >
        <div className="p-4 pt-14 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Products</h2>
          <div className="relative mt-3 group">
            <input
              type="text"
              placeholder="Search anything about a product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
              <div className="mb-2 text-gray-100">You can search by anything related to your product</div>
              🔍 You can search by:
              <ul className="list-disc list-inside mt-1 space-y-1 text-gray-200">
                <li>Name or price</li>
                <li>Description and technical details</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => setSelectedProduct({ id: 0, name: "", isNew: true })}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition w-full sm:w-auto"
          >
            + Add New Product
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleSelect(product)}
                className={`p-4 cursor-pointer ${
                  selectedProduct?.id === product.id
                    ? isDark
                      ? "bg-slate-700/80 border-l-4 border-blue-400"
                      : "bg-blue-50 border-l-4 border-blue-500"
                    : isDark
                    ? "hover:bg-gray-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <h3 className={`font-medium ${isDark ? "text-gray-100" : "text-gray-900"}`}>{product.name}</h3>
                <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-500"}`}>
                  ${product.price?.toFixed(2) || "0.00"}
                </p>
              </div>
            ))
          ) : (
            <div className="p-4 text-gray-500 dark:text-gray-400">No products found</div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className={`${isMobile ? "block w-full" : "w-2/3"}`}>
          <ProductDetail
            product={selectedProduct}
            // ✅ FIX #2: Added explicit Product type to updatedProduct parameter
            //    to resolve ts(7006) implicit 'any' type error.
            onSave={(updatedProduct: Product) => {
              setProducts((prev) => {
                const existingIndex = prev.findIndex((p) => p.id === updatedProduct.id);

                if (selectedProduct.isNew) {
                  setShowFirstProductTip(true);
                  return [updatedProduct, ...prev];
                }

                if (existingIndex !== -1) {
                  return prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
                }

                const selectedIndex = prev.findIndex((p) => p.id === selectedProduct.id);
                if (selectedIndex === -1) {
                  return [...prev, updatedProduct];
                }

                const next = [...prev];
                next.splice(selectedIndex + 1, 0, updatedProduct);
                return next;
              });
              setSelectedProduct(updatedProduct);
            }}
            onDelete={() => {
              setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
              const remaining = products.filter((p) => p.id !== selectedProduct.id);
              setSelectedProduct(remaining.length > 0 ? remaining[0] : null);
            }}
            onCancel={() => {
              if (selectedProduct.isNew) {
                const remaining = products.filter((p) => !p.isNew);
                setSelectedProduct(remaining.length > 0 ? remaining[0] : null);
              } else {
                setSelectedProduct(
                  products.find((p) => p.id === selectedProduct.id) || products[0] || null
                );
              }
              window.location.href = "/";
            }}
          />
        </div>
      )}

      {isMobile && selectedProduct && !selectedProduct.isNew && (
        <button
          onClick={() => setSelectedProduct(null)}
          className="fixed top-4 left-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      )}

      {showFirstProductTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 Product Created!
            </h2>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              Your product has been saved successfully.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              To update or add technical details, click the{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                Edit
              </span>{" "}
              button on the product detail page.
            </p>

            <button
              onClick={() => setShowFirstProductTip(false)}
              className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              Got it! 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
