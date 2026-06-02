import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "./tokens";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: CSSProperties;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
  containerStyle,
}: SelectFieldProps) {
  const { t } = useTranslation();

  return (
    <div style={{ ...styles.wrapper, ...containerStyle }}>
      {label ? <label style={styles.label}>{label}</label> : null}
      <div style={styles.fieldWrap}>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...styles.field,
            ...(error ? styles.fieldError : null),
            ...(disabled ? styles.fieldDisabled : null),
            ...(value ? null : styles.placeholderValue),
          }}
        >
          <option value="" disabled>
            {placeholder ?? t("common.select")}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} style={styles.optionText}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={styles.caret} aria-hidden>
          ▾
        </span>
      </div>
      {error ? <span style={styles.errorText}>{error}</span> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: colors.textLabel },
  fieldWrap: { position: "relative", display: "flex" },
  field: {
    height: 52,
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "0 40px 0 16px",
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    appearance: "none",
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  fieldError: { borderColor: colors.borderError },
  fieldDisabled: { opacity: 0.5, cursor: "not-allowed" },
  placeholderValue: { color: colors.textPlaceholder },
  optionText: { color: colors.textPrimary },
  caret: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: colors.textSecondary,
    fontSize: 12,
  },
  errorText: { fontSize: 12, color: colors.error, marginTop: 2 },
};
