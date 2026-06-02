import config from "../config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

interface HttpError extends Error {
  status: number;
  data: unknown;
}

/**
 * A small fetch-based HTTP client with pluggable auth — same surface as the
 * mobile base (services/index.ts): get/post/put/patch/delete, absolute URLs,
 * `setAuthTokenGetter`, `setUnauthorizedHandler`.
 *
 * Web addition over the current mobile base: a one-shot 401 refresh-retry.
 * `setTokenRefresher` supplies a function that mints a fresh access token; on a
 * 401 the client calls it once (concurrent 401s share a single in-flight
 * refresh via a lock), then replays the original request. If refresh yields no
 * token, `unauthorizedHandler` runs and the session is cleared. NOTE: this
 * refresh-retry will be back-ported to the mobile HttpClient in a later step so
 * both sides stay identical.
 *
 * FormData bodies (multipart uploads) are passed through untouched and the JSON
 * Content-Type is dropped so the browser sets the multipart boundary.
 */
class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private authTokenGetter?: () => string | null;
  private unauthorizedHandler?: () => void;
  private tokenRefresher?: () => Promise<string | null>;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  setAuthTokenGetter(getter: () => string | null) {
    this.authTokenGetter = getter;
  }

  setUnauthorizedHandler(handler: () => void) {
    this.unauthorizedHandler = handler;
  }

  /** Supplies a refresh function used to recover from a 401 exactly once. */
  setTokenRefresher(refresher: () => Promise<string | null>) {
    this.tokenRefresher = refresher;
  }

  private buildURL(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    // Absolute URLs ignore the base; relative ones resolve against it.
    const url = new URL(path, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, String(value)),
      );
    }
    return url.toString();
  }

  private buildHeaders(
    extra: Record<string, string> | undefined,
    isFormData: boolean,
  ): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders, ...extra };
    if (isFormData) {
      // Let the browser set multipart/form-data with the correct boundary.
      delete headers["Content-Type"];
    }
    const token = this.authTokenGetter?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /** One in-flight refresh shared by all concurrent 401s (single-flight lock). */
  private async refreshOnce(): Promise<string | null> {
    if (!this.tokenRefresher) return null;
    if (!this.refreshPromise) {
      this.refreshPromise = this.tokenRefresher().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig,
    retried = false,
  ): Promise<T> {
    const url = this.buildURL(path, requestConfig?.params);
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const headers = this.buildHeaders(requestConfig?.headers, isFormData);

    const response = await fetch(url, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        // First 401: try a single refresh, then replay the request once.
        if (!retried && this.tokenRefresher) {
          const newToken = await this.refreshOnce();
          if (newToken) {
            return this.request<T>(method, path, body, requestConfig, true);
          }
        }
        this.unauthorizedHandler?.();
      }
      const error = new Error(`HTTP ${response.status}`) as HttpError;
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  get<T>(path: string, requestConfig?: RequestConfig) {
    return this.request<T>("GET", path, undefined, requestConfig);
  }

  post<T>(path: string, body?: unknown, requestConfig?: RequestConfig) {
    return this.request<T>("POST", path, body, requestConfig);
  }

  put<T>(path: string, body?: unknown, requestConfig?: RequestConfig) {
    return this.request<T>("PUT", path, body, requestConfig);
  }

  patch<T>(path: string, body?: unknown, requestConfig?: RequestConfig) {
    return this.request<T>("PATCH", path, body, requestConfig);
  }

  delete<T>(path: string, requestConfig?: RequestConfig) {
    return this.request<T>("DELETE", path, undefined, requestConfig);
  }
}

export const api = new HttpClient(config.apiBaseUrl);

export type { HttpError, RequestConfig };
