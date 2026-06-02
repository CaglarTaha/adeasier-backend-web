import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { colors, theme } from "../components/ui";

interface PlaceholderProps {
  /** i18n key for the section title (e.g. "nav.feed"). */
  titleKey: string;
}

/** Temporary screen for routes that arrive in later build steps. */
export function Placeholder({ titleKey }: PlaceholderProps) {
  const { t } = useTranslation();
  return (
    <div style={styles.card}>
      <h1 style={styles.title}>{t(titleKey)}</h1>
      <p style={styles.body}>{t("placeholder.body")}</p>
      <span style={styles.badge}>{t("common.comingSoon")}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxxl,
    boxShadow: theme.shadow.card,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.sm,
    alignItems: "flex-start",
  },
  title: { fontSize: 24, fontWeight: 700, color: colors.textPrimary, margin: 0 },
  body: { fontSize: 15, color: colors.textSecondary, margin: 0 },
  badge: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent,
    backgroundColor: colors.accentSurface,
    borderRadius: theme.radius.pill,
    padding: "4px 12px",
  },
};
