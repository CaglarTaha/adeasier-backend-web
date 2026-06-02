/**
 * App-level configuration. The base URL for the shared HTTP client comes from
 * the build-time env var `VITE_API_URL` (see `.env.example`), falling back to
 * the local backend during development.
 */
const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
} as const;

export default config;
