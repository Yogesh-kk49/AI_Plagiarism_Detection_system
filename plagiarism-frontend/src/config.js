// Single source of truth for the backend URL.
// Set VITE_API_BASE_URL in a .env file (see .env.example) when deploying
// so the frontend doesn't stay hardwired to localhost in production.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";