import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// `postgres.js` client. Single shared connection pool for the app process.
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export { schema };
