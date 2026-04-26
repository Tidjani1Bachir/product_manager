// import { open } from "@tauri-apps/plugin-shell";
import { useState } from "react";
import { API_BASE_URL } from "../services/runtimeConfig";

interface PdfDownloadButtonProps {
  productId: number;
  productName?: string; // ← add product name prop
}

export default function PdfDownloadButton({ productId, productName }: PdfDownloadButtonProps) {
  const [showPopup, setShowPopup] = useState(false);

  const handleDownload = async () => {
  const url = `${API_BASE_URL}/products/${productId}/pdf`;

  try {
    // Fetch the PDF as a blob and download it directly
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create a hidden link and click it to trigger download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${productName || "product"}_details.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Download failed:", err);
  }

  // Show popup
  setShowPopup(true);
};

  return (
    <>
      <button
        onClick={handleDownload}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        Download PDF
      </button>

      {/* ✅ Popup Notification */}
      {showPopup && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 max-w-sm animate-fade-in">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600 dark:text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              PDF Downloaded!
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {productName || "Product"}
              </span>{" "}
              has been saved to your Downloads folder.
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowPopup(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}