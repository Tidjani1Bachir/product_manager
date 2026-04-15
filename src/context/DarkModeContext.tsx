// // src/context/DarkModeContext.jsx
// import { createContext, useContext, useEffect, useState } from "react";

// /**
//  * DarkModeContext provides:
//  * - darkMode: boolean (current mode)
//  * - toggleDarkMode: function to switch modes
//  *
//  * Automatically detects system preference and saves user choice to localStorage
//  */
// const DarkModeContext = createContext();

// export function DarkModeProvider({ children }) {
//   const [darkMode, setDarkMode] = useState(() => {
//     // 1. Check localStorage for user preference
//     const saved = localStorage.getItem("darkMode");
//     if (saved !== null) return JSON.parse(saved);

//     // 2. Fallback to system preference
//     return window.matchMedia("(prefers-color-scheme: dark)").matches;
//   });

//   // Apply dark mode class to <html> and save to localStorage
//   useEffect(() => {
//     if (darkMode) {
//       document.documentElement.classList.add("dark");
//     } else {
//       document.documentElement.classList.remove("dark");
//     }
//     localStorage.setItem("darkMode", JSON.stringify(darkMode));
//   }, [darkMode]);

//   const toggleDarkMode = () => setDarkMode(!darkMode);

//   return (
//     <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
//       {children}
//     </DarkModeContext.Provider>
//   );
// }

// // Custom hook to use dark mode in components
// export function useDarkMode() {
//   return useContext(DarkModeContext);
// }
