import { useAuthStore } from "../store/auth";
import { useUiStore } from "../store/ui";

/**
 * Gate an action behind authentication (mirror of the mobile hook).
 *
 *   const requireAuth = useRequireAuth();
 *   <Button onClick={() => requireAuth(() => openDeal())} />
 *
 * If signed in, the action runs immediately. Otherwise the login modal opens
 * and the action runs after a successful sign-in (via pendingAction).
 */
export function useRequireAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const openLoginModal = useUiStore((state) => state.openLoginModal);

  return (action: () => void) => {
    if (accessToken) {
      action();
    } else {
      openLoginModal(action);
    }
  };
}
