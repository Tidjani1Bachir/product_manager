
interface DeleteWarningProps {
  open: boolean;
  onClose: (value: boolean) => void;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteWarning({
  open,
  onClose,
  title = "Warning",
  message = "Are you sure you want to delete Product",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
}: DeleteWarningProps) {
  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <svg
            className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86l-6.93 12A1 1 0 004.24 18h15.52a1 1 0 00.87-1.47l-6.93-12a1 1 0 00-1.74 0z"
            />
          </svg>
        </div>
        <h2 className="text-center text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
          {message}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="min-w-[100px] px-4 py-2 rounded-lg border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="min-w-[100px] px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}