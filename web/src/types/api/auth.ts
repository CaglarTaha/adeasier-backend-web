// Generic camelCase types — single auth, role lives on User.role (no dual
// session). Shapes match the Adeasier backend (routes/auth.ts).

export type Role = "brand" | "creator";

/** The currently authenticated user (passwordHash is never sent by the API). */
export interface User {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  niche?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: Role;
  displayName: string;
  niche?: string | null;
}

/** Returned by both /auth/register and /auth/login. */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User;
}
