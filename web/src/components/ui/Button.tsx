import type { CSSProperties, ReactNode } from "react";
import { colors } from "./tokens";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "md" | "sm";

interface ButtonProps {
  title: string;
  onClick: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: CSSProperties;
}

export function Button({
  title,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const variantStyle: CSSProperties =
    variant === "primary"
      ? { backgroundColor: colors.primary, color: colors.background }
      : variant === "outline"
        ? {
            backgroundColor: colors.background,
            color: colors.primary,
            border: `1px solid ${colors.border}`,
          }
        : { backgroundColor: "transparent", color: colors.accent };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...styles.base,
        ...(size === "sm" ? styles.sm : styles.md),
        ...variantStyle,
        ...(isDisabled ? styles.disabled : null),
        ...style,
      }}
    >
      {loading ? (
        <span style={styles.spinner} aria-hidden />
      ) : (
        <span style={styles.content}>
          {leftIcon}
          <span style={size === "sm" ? styles.textSm : styles.text}>{title}</span>
          {rightIcon}
        </span>
      )}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  base: {
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  md: { padding: "15px 18px" },
  sm: { padding: "8px 14px", borderRadius: 10 },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  content: { display: "inline-flex", alignItems: "center", gap: 8 },
  text: { fontSize: 15, fontWeight: 600 },
  textSm: { fontSize: 13, fontWeight: 600 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.5)",
    borderTopColor: "currentColor",
    display: "inline-block",
    animation: "adeasier-spin 0.7s linear infinite",
  },
};
