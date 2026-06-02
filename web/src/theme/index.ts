// Centralized design tokens. Names mirror the mobile base (src/theme/index.ts)
// so both clients stay in structural parity. No magic values in components —
// pull spacing/radius/colors/typography from here.

export const colors = {
  primary: "#111827",
  accent: "#2563EB",

  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textLabel: "#374151",
  textPlaceholder: "#9CA3AF",

  border: "#E5E7EB",
  borderError: "#EF4444",

  background: "#FFFFFF",
  inputBackground: "#F9FAFB",

  dotInactive: "#D1D5DB",
  tagBackground: "#DBEAFE",
  accentSurface: "#EFF6FF",

  error: "#EF4444",
};

export const theme = {
  palette: {
    background: "#F2F2F7",
    surface: "#FFFFFF",
    surfacePressed: "#F5F5F7",
    divider: "rgba(60, 60, 67, 0.10)",

    textPrimary: "#1C1C1E",
    textSecondary: "#3C3C43",
    textTertiary: "#8E8E93",
    textPlaceholder: "#C7C7CC",

    accent: "#2563EB",
    success: "#34C759",
    warning: "#FF9500",
    danger: "#FF3B30",

    iconBlue: "#0A84FF",
    iconOrange: "#FF9500",
    iconGreen: "#34C759",
    iconRed: "#FF3B30",
    iconPurple: "#AF52DE",
    iconIndigo: "#5856D6",
    iconGray: "#8E8E93",
    iconTeal: "#30B0C7",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },

  typography: {
    largeTitle: { fontSize: 34, fontWeight: 700, letterSpacing: 0.37 },
    title: { fontSize: 17, fontWeight: 600, letterSpacing: -0.4 },
    body: { fontSize: 17, fontWeight: 400, letterSpacing: -0.4 },
    subhead: { fontSize: 15, fontWeight: 400, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: 400, letterSpacing: -0.08 },
    caption: { fontSize: 12, fontWeight: 500, letterSpacing: 0.4 },
    micro: { fontSize: 10, fontWeight: 500, letterSpacing: 0.5 },
  },

  // CSS box-shadow equivalents of the mobile shadow tokens.
  shadow: {
    card: "0 2px 10px rgba(0, 0, 0, 0.04)",
  },

  layout: {
    minRowHeight: 52,
    iconSize: 30,
    iconRadius: 7,
    horizontalPadding: 20,
    sectionGap: 28,
    maxContentWidth: 960,
  },
} as const;

export type AppTheme = typeof theme;
