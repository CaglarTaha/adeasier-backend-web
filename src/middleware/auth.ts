import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { verifyAccess } from "../lib/jwt";
import { unauthorized, forbidden } from "./error";
import type { AppBindings, Role, SafeUser } from "../types";

// Verifies the Bearer access token, loads the user, and stashes both the
// decoded payload (c.get('jwt')) and the safe user record (c.get('user')).
export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw unauthorized("Missing Bearer token");
  }
  const token = header.slice("Bearer ".length).trim();

  let payload;
  try {
    payload = await verifyAccess(token);
  } catch {
    throw unauthorized("Invalid or expired access token", "invalid_token");
  }

  const [row] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!row) throw unauthorized("User no longer exists");

  const { passwordHash: _ph, ...safe } = row;
  c.set("jwt", payload);
  c.set("user", safe as SafeUser);
  await next();
};

// Like requireAuth but never rejects: if a valid Bearer token is present the
// user/jwt are populated, otherwise the request proceeds as anonymous.
// Used by public reads (listings) that still vary output by viewer identity.
export const optionalAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = await verifyAccess(token);
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub));
      if (row) {
        const { passwordHash: _ph, ...safe } = row;
        c.set("jwt", payload);
        c.set("user", safe as SafeUser);
      }
    } catch {
      // ignore invalid token -> treat as anonymous
    }
  }
  await next();
};

// Gate a route to a specific role. Use AFTER requireAuth.
export function requireRole(role: Role): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== role) {
      throw forbidden(`Requires ${role} role`, "wrong_role");
    }
    await next();
  };
}
