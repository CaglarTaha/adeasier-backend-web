import { Routes, Route } from "react-router-dom";
import { AppLayout } from "../components/layout";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { Placeholder } from "../pages/Placeholder";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RequireAuth, RequireRole } from "./guards";

/**
 * Single router with the session/role split:
 *  - Public: feed, listing detail, register.
 *  - Auth-gated (RequireAuth): my-listings, create-listing, deals, wallet.
 *  - Role-gated (RequireRole): upload-video is creator-only.
 * Sign-in itself is a modal (LoginModal), not a route.
 *
 * The marketplace pages are placeholders until the next build steps fill them.
 */
export function RootRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
          {/* Public */}
          <Route index element={<Placeholder titleKey="nav.feed" />} />
          <Route
            path="listings/:id"
            element={<Placeholder titleKey="nav.feed" />}
          />
          <Route path="register" element={<RegisterPage />} />

          {/* Auth-gated */}
          <Route
            path="my-listings"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.myListings" />
              </RequireAuth>
            }
          />
          <Route
            path="create-listing"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.createListing" />
              </RequireAuth>
            }
          />
          <Route
            path="deals"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.deals" />
              </RequireAuth>
            }
          />
          <Route
            path="deals/:id"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.deals" />
              </RequireAuth>
            }
          />
          <Route
            path="wallet"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.wallet" />
              </RequireAuth>
            }
          />

          {/* Role-gated (creator-only) */}
          <Route
            path="upload-video/:dealId"
            element={
              <RequireRole role="creator">
                <Placeholder titleKey="nav.deals" />
              </RequireRole>
            }
          />
          <Route
            path="jobs/:id"
            element={
              <RequireAuth>
                <Placeholder titleKey="nav.deals" />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
  );
}
