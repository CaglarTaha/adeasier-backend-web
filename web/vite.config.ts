import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React 19 + TS web client for the Adeasier marketplace. Talks to the Bun/Hono
// backend at VITE_API_URL via the shared fetch-based HttpClient (src/services).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
