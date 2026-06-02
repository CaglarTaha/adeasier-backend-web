import { sign, verify } from "hono/jwt";
import type { JWTPayload, Role } from "../types";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "JWT_ACCESS_SECRET / JWT_REFRESH_SECRET not set. See .env.example."
  );
}

const ACCESS_TTL = 60 * 60; // 1 hour
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export async function signAccess(userId: string, role: Role): Promise<string> {
  const payload: JWTPayload = {
    sub: userId,
    role,
    type: "access",
    iat: nowSec(),
    exp: nowSec() + ACCESS_TTL,
  };
  return sign(payload, ACCESS_SECRET!);
}

export async function signRefresh(userId: string, role: Role): Promise<string> {
  const payload: JWTPayload = {
    sub: userId,
    role,
    type: "refresh",
    iat: nowSec(),
    exp: nowSec() + REFRESH_TTL,
  };
  return sign(payload, REFRESH_SECRET!);
}

export async function verifyAccess(token: string): Promise<JWTPayload> {
  const payload = (await verify(token, ACCESS_SECRET!, "HS256")) as JWTPayload;
  if (payload.type !== "access") throw new Error("Not an access token");
  return payload;
}

export async function verifyRefresh(token: string): Promise<JWTPayload> {
  const payload = (await verify(token, REFRESH_SECRET!, "HS256")) as JWTPayload;
  if (payload.type !== "refresh") throw new Error("Not a refresh token");
  return payload;
}
