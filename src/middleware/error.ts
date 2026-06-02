import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// Application error carrying a stable machine-readable code + HTTP status.
export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Convenience constructors.
export const badRequest = (msg: string, code = "bad_request") =>
  new HttpError(400, code, msg);
export const unauthorized = (msg = "Unauthorized", code = "unauthorized") =>
  new HttpError(401, code, msg);
export const forbidden = (msg = "Forbidden", code = "forbidden") =>
  new HttpError(403, code, msg);
export const notFound = (msg = "Not found", code = "not_found") =>
  new HttpError(404, code, msg);
export const conflict = (msg: string, code = "conflict") =>
  new HttpError(409, code, msg);

// Hono onError handler — always emits { error: { message, code } }.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json(
      { error: { message: err.message, code: err.code } },
      err.status as 400
    );
  }
  if (err instanceof HTTPException) {
    return c.json(
      { error: { message: err.message, code: "http_error" } },
      err.status
    );
  }
  console.error("[unhandled]", err);
  return c.json(
    { error: { message: "Internal server error", code: "internal_error" } },
    500
  );
}
