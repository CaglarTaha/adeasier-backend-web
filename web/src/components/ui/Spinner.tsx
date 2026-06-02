import { colors } from "./tokens";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 24, color = colors.accent }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="loading"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, Math.round(size / 10))}px solid ${colors.border}`,
        borderTopColor: color,
        display: "inline-block",
        animation: "adeasier-spin 0.7s linear infinite",
      }}
    />
  );
}
