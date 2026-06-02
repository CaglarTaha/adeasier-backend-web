import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "../app-header";
import { colors, theme } from "../ui";

/** App shell: sticky header + centered content container for every route. */
export function AppLayout() {
  return (
    <div style={styles.root}>
      <AppHeader />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    backgroundColor: theme.palette.background,
    color: colors.textPrimary,
  },
  main: {
    maxWidth: theme.layout.maxContentWidth,
    margin: "0 auto",
    padding: `${theme.spacing.xxl}px ${theme.layout.horizontalPadding}px`,
  },
};
