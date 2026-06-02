import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { AuthService } from "../../services/auth";
import { Button, Input, Modal, colors } from "../ui";

type Errors = { email?: string; password?: string; general?: string };

export function LoginModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const visible = useUiStore((s) => s.loginModalVisible);
  const closeLoginModal = useUiStore((s) => s.closeLoginModal);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!email.trim()) e.email = t("auth.errors.requiredEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = t("auth.errors.invalidEmail");
    if (!password) e.password = t("auth.errors.requiredPassword");
    return e;
  }

  function reset() {
    setEmail("");
    setPassword("");
    setErrors({});
    setLoading(false);
  }

  function handleClose() {
    reset();
    closeLoginModal();
  }

  async function handleLogin() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await AuthService.login({ email: email.trim(), password });
      // Run the gated action captured when the modal was opened (if any).
      const action = useUiStore.getState().pendingAction;
      login({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      reset();
      closeLoginModal();
      action?.();
    } catch {
      setErrors({ general: t("auth.loginFailed") });
      setLoading(false);
    }
  }

  function goToRegister() {
    handleClose();
    navigate("/register");
  }

  const subtitle = (
    <span style={styles.registerRow}>
      {t("auth.newHere")}
      <button type="button" style={styles.registerLink} onClick={goToRegister}>
        {t("auth.createAccount")}
      </button>
    </span>
  );

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={t("auth.signIn")}
      subtitle={subtitle}
    >
      <Input
        label={t("auth.email")}
        placeholder={t("auth.emailPlaceholder")}
        type="email"
        autoCapitalize="none"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        error={errors.email}
      />
      <Input
        label={t("auth.password")}
        placeholder={t("auth.passwordPlaceholder")}
        type="password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setErrors((e) => ({ ...e, password: undefined }));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleLogin();
        }}
        error={errors.password}
      />

      {errors.general ? (
        <div style={styles.generalError}>
          <span style={styles.generalErrorText}>{errors.general}</span>
        </div>
      ) : null}

      <Button title={t("auth.signIn")} onClick={handleLogin} loading={loading} />
    </Modal>
  );
}

const styles: Record<string, CSSProperties> = {
  registerRow: { display: "inline", fontSize: 14, color: colors.textSecondary },
  registerLink: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: colors.accent,
    padding: 0,
  },
  generalError: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    border: "1px solid #FECACA",
  },
  generalErrorText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
};
