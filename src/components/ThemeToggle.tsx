import {useThemeStore} from "../store/useThemeStore";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-sm transition"
      aria-label="Toggle theme"
    >
      {/* Sun Icon */}
      <svg
        className={`h-6 w-6 text-yellow-500 transition-all absolute inset-0 m-auto ${
          isDark ? "opacity-0 scale-0" : "opacity-100 scale-100"
        }`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4m8.485-8.485h-4m-12 0h-4M19.07 4.93l-2.828 2.828m-11.314 0L2.93 4.93m16.485 16.485l-2.828-2.828m-11.314 0l-2.828 2.828" />
      </svg>

      {/* Moon Icon */}
      <svg
        className={`h-6 w-6 text-blue-300 transition-all absolute inset-0 m-auto ${
          isDark ? "opacity-100 scale-100" : "opacity-0 scale-0"
        }`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
