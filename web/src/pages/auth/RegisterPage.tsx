import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services/auth";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { Button, Input, SelectField, colors, theme } from "../../components/ui";
import type { Role } from "../../types/api/auth";

type Fields = {
  displayName: string;
  email: string;
  password: string;
  role: "" | Role;
  niche: string;
};

type Errors = Partial<Record<keyof Fields | "general", string>>;

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const openLoginModal = useUiStore((s) => s.openLoginModal);

  const [fields, setFields] = useState<Fields>({
    displayName: "",
    email: "",
    password: "",
    role: "",
    niche: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  function validate(f: Fields): Errors {
    const e: Errors = {};
    if (!f.displayName.trim()) e.displayName = t("auth.errors.requiredDisplayName");
    if (!f.email.trim()) e.email = t("auth.errors.requiredEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      e.email = t("auth.errors.invalidEmail");
    if (!f.password) e.password = t("auth.errors.requiredPassword");
    else if (f.password.length < 6) e.password = t("auth.errors.passwordMin");
    if (!f.role) e.role = t("auth.errors.requiredRole");
    return e;
  }

  function set<K extends keyof Fields>(key: K) {
    return (value: Fields[K]) => {
      setFields((f) => ({ ...f, [key]: value }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    };
  }

  async function handleRegister() {
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await AuthService.register({
        email: fields.email.trim(),
        password: fields.password,
        role: fields.role as Role,
        displayName: fields.displayName.trim(),
        niche:
          fields.role === "creator" && fields.niche.trim()
            ? fields.niche.trim()
            : null,
      });
      login({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      navigate("/");
    } catch {
      setErrors({ general: t("auth.registerError") });
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("auth.registerTitle")}</h1>
      <p style={styles.subtitle}>{t("auth.registerSubtitle")}</p>

      <div style={styles.subtitleRow}>
        <span style={styles.muted}>{t("auth.alreadyHaveAccount")}</span>
        <button
          type="button"
          style={styles.link}
          onClick={() => openLoginModal()}
        >
          {t("auth.signIn")}
        </button>
      </div>

      <div style={styles.form}>
        <Input
          label={t("auth.displayName")}
          placeholder={t("auth.displayNamePlaceholder")}
          value={fields.displayName}
          onChangeText={set("displayName")}
          error={errors.displayName}
        />
        <Input
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          autoCapitalize="none"
          value={fields.email}
          onChangeText={set("email")}
          error={errors.email}
        />
        <Input
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          type="password"
          value={fields.password}
          onChangeText={set("password")}
          error={errors.password}
        />
        <SelectField
          label={t("auth.role")}
          placeholder={t("auth.rolePlaceholder")}
          value={fields.role}
          onChange={(v) => set("role")(v as Role)}
          options={[
            { value: "brand", label: t("roles.brand") },
            { value: "creator", label: t("roles.creator") },
          ]}
          error={errors.role}
        />
        {fields.role === "creator" ? (
          <Input
            label={t("auth.niche")}
            placeholder={t("auth.nichePlaceholder")}
            value={fields.niche}
            onChangeText={set("niche")}
          />
        ) : null}
      </div>

      {errors.general ? (
        <div style={styles.generalError}>
          <span style={styles.generalErrorText}>{errors.general}</span>
        </div>
      ) : null}

      <Button
        title={t("auth.register")}
        onClick={handleRegister}
        loading={loading}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 440,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.lg,
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    boxShadow: theme.shadow.card,
  },
  title: { fontSize: 28, fontWeight: 700, color: colors.textPrimary, margin: 0 },
  subtitle: { fontSize: 15, color: colors.textSecondary, margin: 0 },
  subtitleRow: { display: "flex", alignItems: "center", gap: 4 },
  muted: { fontSize: 14, color: colors.textSecondary },
  link: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: colors.accent,
    padding: 0,
  },
  form: { display: "flex", flexDirection: "column", gap: theme.spacing.lg },
  generalError: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    border: "1px solid #FECACA",
  },
  generalErrorText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
};
