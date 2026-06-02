import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import config from "./config";
import { api } from "./services";
import { useAuthStore } from "./store/auth";
import { useSettingsStore } from "./store/settings";
import { changeLanguage } from "./i18n";
import { RootRouter } from "./routes/RootRouter";
import { LoginModal } from "./components/login-modal";
import { Spinner } from "./components/ui";

// --- HttpClient wiring (mirror of the mobile App setup) -------------------
// Always read the freshest access token from the store on every request.
api.setAuthTokenGetter(() => useAuthStore.getState().accessToken);

// On a hard 401 (refresh failed/absent), clear the session -> back to guest.
api.setUnauthorizedHandler(() => useAuthStore.getState().logout());

// 401 recovery: try the stored refresh token once. Raw fetch (not AuthService)
// so it bypasses the client's own 401 handling and can't recurse.
api.setTokenRefresher(async () => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string };
    if (!data?.accessToken) return null;
    useAuthStore.getState().setTokens(data.accessToken, refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
});

// localStorage is synchronous, so persisted stores are usually hydrated on the
// first render — but we still gate to stay structurally identical to mobile.
function storesHydrated(): boolean {
  return (
    useAuthStore.persist.hasHydrated() && useSettingsStore.persist.hasHydrated()
  );
}

export default function App() {
  const [hydrated, setHydrated] = useState(storesHydrated);

  useEffect(() => {
    if (hydrated) return;
    const update = () => setHydrated(storesHydrated());
    const unsubs = [
      useAuthStore.persist.onFinishHydration(update),
      useSettingsStore.persist.onFinishHydration(update),
    ];
    update();
    return () => unsubs.forEach((u) => u());
  }, [hydrated]);

  // Apply the saved language override once settings have hydrated.
  useEffect(() => {
    if (!hydrated) return;
    const lang = useSettingsStore.getState().language;
    if (lang) changeLanguage(lang);
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <RootRouter />
      <LoginModal />
    </BrowserRouter>
  );
}
