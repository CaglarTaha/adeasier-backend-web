import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { errorHandler } from "./middleware/error";
import authRoutes from "./routes/auth";
import listingRoutes from "./routes/listings";
import dealRoutes from "./routes/deals";
import videoJobRoutes from "./routes/videojobs";
import walletRoutes from "./routes/wallet";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use("*", logger());
app.use("*", cors()); // open CORS for development

// Serve uploaded + processed assets at /uploads/*
app.use("/uploads/*", serveStatic({ root: "./" }));

app.get("/health", (c) => c.json({ ok: true }));

// --- Route mounts ---
app.route("/auth", authRoutes);
app.route("/listings", listingRoutes);
app.route("/deals", dealRoutes);
app.route("/videojobs", videoJobRoutes);
app.route("/wallet", walletRoutes);

app.onError(errorHandler);
app.notFound((c) =>
  c.json({ error: { message: "Not found", code: "not_found" } }, 404)
);

const port = Number(process.env.PORT ?? 4000);
console.log(`🚀 Adeasier API listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
