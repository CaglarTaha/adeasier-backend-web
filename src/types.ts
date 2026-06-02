import type { User } from "./db/schema";

export type Role = "brand" | "creator";

// Payload we embed in JWTs. `type` distinguishes access vs refresh tokens.
export interface JWTPayload {
  sub: string; // user id
  role: Role;
  type: "access" | "refresh";
  // standard claims added by hono/jwt sign (exp, iat) are merged in at runtime
  [key: string]: unknown;
}

// Hono context variables (c.get / c.set). The authed user (without passwordHash).
export type SafeUser = Omit<User, "passwordHash">;

export interface AppVariables {
  user: SafeUser;
  jwt: JWTPayload;
}

export type AppBindings = {
  Variables: AppVariables;
};
