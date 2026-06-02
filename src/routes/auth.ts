import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { badRequest, conflict, unauthorized } from "../middleware/error";
import type { AppBindings, Role, SafeUser } from "../types";

const auth = new Hono<AppBindings>();

const ROLES: Role[] = ["brand", "creator"];

function toSafeUser(row: typeof users.$inferSelect): SafeUser {
  const { passwordHash: _ph, ...safe } = row;
  return safe;
}

// POST /auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) throw badRequest("Invalid JSON body");

  const { email, password, role, displayName, niche } = body as Record<
    string,
    unknown
  >;

  if (typeof email !== "string" || !email.includes("@"))
    throw badRequest("Valid email required", "invalid_email");
  if (typeof password !== "string" || password.length < 6)
    throw badRequest("Password must be at least 6 chars", "weak_password");
  if (typeof role !== "string" || !ROLES.includes(role as Role))
    throw badRequest("role must be 'brand' or 'creator'", "invalid_role");
  if (typeof displayName !== "string" || displayName.trim().length === 0)
    throw badRequest("displayName required", "invalid_display_name");

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (existing) throw conflict("Email already registered", "email_taken");

  const passwordHash = await Bun.password.hash(password);

  const [row] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      role: role as Role,
      displayName: displayName.trim(),
      niche: typeof niche === "string" ? niche : null,
    })
    .returning();

  const user = toSafeUser(row!);
  const accessToken = await signAccess(user.id, user.role);
  const refreshToken = await signRefresh(user.id, user.role);
  return c.json({ user, accessToken, refreshToken }, 201);
});

// POST /auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) throw badRequest("Invalid JSON body");
  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string")
    throw badRequest("email and password required");

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));
  if (!row) throw unauthorized("Invalid credentials", "invalid_credentials");

  const ok = await Bun.password.verify(password, row.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials", "invalid_credentials");

  const user = toSafeUser(row);
  const accessToken = await signAccess(user.id, user.role);
  const refreshToken = await signRefresh(user.id, user.role);
  return c.json({ user, accessToken, refreshToken });
});

// POST /auth/refresh
auth.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = body?.refreshToken;
  if (typeof refreshToken !== "string")
    throw badRequest("refreshToken required");

  let payload;
  try {
    payload = await verifyRefresh(refreshToken);
  } catch {
    throw unauthorized("Invalid or expired refresh token", "invalid_token");
  }

  const accessToken = await signAccess(payload.sub, payload.role);
  return c.json({ accessToken });
});

// GET /auth/me
auth.get("/me", requireAuth, (c) => {
  return c.json({ user: c.get("user") });
});

export default auth;
