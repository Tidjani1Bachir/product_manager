// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ✅ Correct — enables class-based dark mode
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          800: "#1f2937",
          900: "#111827",
        },
      },
    },
  },
  plugins: [],
};
