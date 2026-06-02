import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { colors, theme } from "../components/ui";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div style={styles.card}>
      <h1 style={styles.title}>{t("notFound.title")}</h1>
      <Link to="/" style={styles.link}>
        {t("notFound.back")}
      </Link>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.md,
    alignItems: "flex-start",
  },
  title: { fontSize: 24, fontWeight: 700, color: colors.textPrimary, margin: 0 },
  link: { fontSize: 15, fontWeight: 600, color: colors.accent },
};
