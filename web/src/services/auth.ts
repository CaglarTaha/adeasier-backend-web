import { api } from "./index";
import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
} from "../types/api/auth";

/** Auth endpoints against the Adeasier backend, via the shared HTTP client. */
export const AuthService = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>("/auth/register", data),

  login: (data: LoginRequest) => api.post<AuthResponse>("/auth/login", data),

  refresh: (data: RefreshRequest) =>
    api.post<RefreshResponse>("/auth/refresh", data),

  me: () => api.get<MeResponse>("/auth/me"),
};
