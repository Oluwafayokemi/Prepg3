// shared/styles/theme.ts
export const theme = {
  colors: {
    primary: "#2563eb", // Blue
    primaryHover: "#1d4ed8",
    secondary: "#10b981", // Green
    danger: "#ef4444",
    dangerHover: "#dc2626",
    warning: "#f59e0b",

    text: {
      primary: "#111827",
      secondary: "#6b7280",
      light: "#9ca3af",
    },

    background: {
      primary: "#ffffff",
      secondary: "#f9fafb",
      dark: "#111827",
    },

    border: {
      light: "#e5e7eb",
      medium: "#d1d5db",
      dark: "#9ca3af",
    },

    success: "#10b981",
    error: "#ef4444",
    info: "#3b82f6",
  },

  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
  },

  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
  },

  breakpoints: {
    mobile: "640px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1280px",
  },

  typography: {
    fontFamily: {
      sans: "Inter, system-ui, -apple-system, sans-serif",
      mono: "ui-monospace, monospace",
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};

