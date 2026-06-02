import { create } from "zustand";

// Transient UI state (not persisted). Mirrors the mobile login-modal flow:
// open the modal with an optional action to run after a successful sign-in.
interface UiState {
  loginModalVisible: boolean;
  pendingAction: (() => void) | null;

  openLoginModal: (onSuccess?: () => void) => void;
  closeLoginModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  loginModalVisible: false,
  pendingAction: null,

  openLoginModal: (onSuccess) =>
    set({ loginModalVisible: true, pendingAction: onSuccess ?? null }),
  closeLoginModal: () => set({ loginModalVisible: false, pendingAction: null }),
}));
