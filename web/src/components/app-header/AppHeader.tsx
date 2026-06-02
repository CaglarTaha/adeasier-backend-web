import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { useSettingsStore } from "../../store/settings";
import { changeLanguage, SUPPORTED_LANGUAGES } from "../../i18n";
import type { AppLanguage } from "../../i18n";
import { Button, colors, theme } from "../ui";

export function AppHeader() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const authed = status === "authenticated";

  function toggleLanguage() {
    const current = i18n.language as AppLanguage;
    const next =
      SUPPORTED_LANGUAGES[
        (SUPPORTED_LANGUAGES.indexOf(current) + 1) % SUPPORTED_LANGUAGES.length
      ];
    setLanguage(next);
    changeLanguage(next);
  }

  const navLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
    ...styles.navLink,
    ...(isActive ? styles.navLinkActive : null),
  });

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={styles.brand}>
          {t("common.appName")}
        </Link>

        <nav style={styles.nav}>
          <NavLink to="/" end style={navLinkStyle}>
            {t("nav.feed")}
          </NavLink>
          {authed ? (
            <>
              <NavLink to="/my-listings" style={navLinkStyle}>
                {t("nav.myListings")}
              </NavLink>
              <NavLink to="/create-listing" style={navLinkStyle}>
                {t("nav.createListing")}
              </NavLink>
              <NavLink to="/deals" style={navLinkStyle}>
                {t("nav.deals")}
              </NavLink>
              <NavLink to="/wallet" style={navLinkStyle}>
                {t("nav.wallet")}
              </NavLink>
            </>
          ) : null}
        </nav>

        <div style={styles.right}>
          <button type="button" style={styles.langBtn} onClick={toggleLanguage}>
            {i18n.language.toUpperCase()}
          </button>
          {authed && user ? (
            <div style={styles.userBlock}>
              <span style={styles.userName}>{user.displayName}</span>
              <span style={styles.roleBadge}>{t(`roles.${user.role}`)}</span>
              <Button
                title={t("nav.signOut")}
                variant="outline"
                size="sm"
                onClick={logout}
              />
            </div>
          ) : (
            <Button
              title={t("nav.signIn")}
              size="sm"
              onClick={() => openLoginModal()}
            />
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  inner: {
    maxWidth: theme.layout.maxContentWidth,
    margin: "0 auto",
    padding: `${theme.spacing.md}px ${theme.layout.horizontalPadding}px`,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primary,
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
    flexWrap: "wrap",
  },
  navLink: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textSecondary,
    textDecoration: "none",
  },
  navLinkActive: { color: colors.accent },
  right: { display: "flex", alignItems: "center", gap: theme.spacing.md },
  langBtn: {
    border: `1px solid ${colors.border}`,
    background: colors.background,
    borderRadius: theme.radius.sm,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    color: colors.textSecondary,
  },
  userBlock: { display: "flex", alignItems: "center", gap: theme.spacing.sm },
  userName: { fontSize: 14, fontWeight: 600, color: colors.textPrimary },
  roleBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.accent,
    backgroundColor: colors.tagBackground,
    borderRadius: theme.radius.pill,
    padding: "2px 8px",
  },
};
