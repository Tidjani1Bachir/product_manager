// Explicitly check for 'undefined' as a string, which can happen in some Docker builds
const rawUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = (rawUrl && rawUrl !== "undefined") ? rawUrl : "/api";

export const API_ORIGIN = window.location.origin;