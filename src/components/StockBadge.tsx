interface StockBadgeProps {
  quantity: number;
  showQuantity?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export default function StockBadge({
  quantity,
  showQuantity = true,
  size = "md",
  onClick,
}: StockBadgeProps) {
  const isOut = quantity === 0;
  
  // Size classes
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };

  // Large size (outline style) for Out of Stock
  if (size === "lg" && isOut) {
    return (
      <button
        onClick={onClick}
        className={`mx-auto flex min-h-[78px] min-w-[112px] flex-col items-center justify-center px-4 py-2 text-xl font-bold text-red-700 dark:text-red-400 border-2 border-red-600 dark:border-red-500 rounded-xl ${onClick ? 'hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition' : ''}`}
      >
        <span className="leading-tight text-center whitespace-pre-line">Out<br/>Of<br/>Stock</span>
      </button>
    );
  }

  // Large size (outline style) for In Stock
  if (size === "lg") {
    return (
      <button
        onClick={onClick}
        className={`mx-auto flex min-h-[78px] min-w-[112px] items-center justify-center px-4 py-2 text-xl font-bold text-green-700 dark:text-green-400 border-2 border-green-600 dark:border-green-500 rounded-xl ${onClick ? 'hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition' : ''}`}
      >
        <span className="leading-tight text-center">In Stock {showQuantity && `(${quantity})`}</span>
      </button>
    );
  }

  // Small/Medium size (pill style) - Out of Stock
  if (isOut) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${sizeClasses[size as keyof typeof sizeClasses]} font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ${onClick ? 'hover:opacity-80 cursor-pointer transition' : ''}`}
      >
        <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400"></span>
        Out of Stock
      </button>
    );
  }

  // Small/Medium size (pill style) - In Stock
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${sizeClasses[size as keyof typeof sizeClasses]} font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ${onClick ? 'hover:opacity-80 cursor-pointer transition' : ''}`}
    >
      <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
      In Stock {showQuantity && `(${quantity})`}
    </button>
  );
}
