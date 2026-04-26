// src/services/runtimeConfig.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() 
  || "https://product-manager-api-psi.vercel.app/api";

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");