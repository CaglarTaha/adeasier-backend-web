// Backend error envelope: every error is `{ error: { message, code } }`.
export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
  };
}

/** Narrow an unknown thrown HttpError's `.data` into the backend envelope. */
export function errorCode(data: unknown): string | null {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as ApiErrorBody).error?.code === "string"
  ) {
    return (data as ApiErrorBody).error.code;
  }
  return null;
}
