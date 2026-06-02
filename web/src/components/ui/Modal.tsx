import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { colors, theme } from "./tokens";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

/** Centered overlay modal — the web counterpart of the mobile bottom sheet. */
export function Modal({ visible, onClose, title, subtitle, children }: ModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div style={styles.backdrop} onClick={onClose} role="presentation">
      <div
        style={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div style={styles.header}>
          <div style={styles.titleBlock}>
            {title ? <h2 style={styles.title}>{title}</h2> : null}
            {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    width: "100%",
    maxWidth: 420,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    padding: theme.spacing.xxl,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  titleBlock: { display: "flex", flexDirection: "column", gap: 4 },
  title: { fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 1,
  },
  body: { display: "flex", flexDirection: "column", gap: theme.spacing.md },
};
