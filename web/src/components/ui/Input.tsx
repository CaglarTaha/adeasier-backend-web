import { useState } from "react";
import type { CSSProperties, InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "./tokens";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  containerStyle?: CSSProperties;
  /** Bound value setter (string), mirroring the mobile `onChangeText`. */
  onChangeText?: (value: string) => void;
}

export function Input({
  label,
  error,
  containerStyle,
  onChangeText,
  type = "text",
  style,
  ...rest
}: InputProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(true);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (hidden ? "password" : "text") : type;

  return (
    <div style={{ ...styles.wrapper, ...containerStyle }}>
      {label ? <label style={styles.label}>{label}</label> : null}
      <div style={styles.row}>
        <input
          {...rest}
          type={resolvedType}
          onChange={(e) => onChangeText?.(e.target.value)}
          style={{
            ...styles.input,
            ...(error ? styles.inputError : null),
            ...(isPassword ? styles.inputWithToggle : null),
            ...style,
          }}
        />
        {isPassword ? (
          <button
            type="button"
            style={styles.eye}
            onClick={() => setHidden((h) => !h)}
          >
            {hidden ? t("common.show") : t("common.hide")}
          </button>
        ) : null}
      </div>
      {error ? <span style={styles.errorText}>{error}</span> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: colors.textLabel },
  row: { position: "relative", display: "flex" },
  input: {
    height: 52,
    boxSizing: "border-box",
    width: "100%",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "0 16px",
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    outline: "none",
    fontFamily: "inherit",
  },
  inputError: { borderColor: colors.borderError },
  inputWithToggle: { paddingRight: 72 },
  eye: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: colors.accent,
  },
  errorText: { fontSize: 12, color: colors.error, marginTop: 2 },
};
