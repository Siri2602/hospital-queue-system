/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Sora", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        surface2: "var(--surface-2)",
        card: "var(--card)",
        border: "var(--border)",
        borderStrong: "var(--border-strong)",
        text: "var(--text)",
        textMuted: "var(--text-muted)",
        primary: "var(--primary)",
        primarySoft: "var(--primary-soft)",
        accent: "var(--accent)",
        success: "var(--success)",
        successSoft: "var(--success-soft)",
        warning: "var(--warning)",
        warningSoft: "var(--warning-soft)",
        danger: "var(--danger)",
        dangerSoft: "var(--danger-soft)",
        info: "var(--info)",
        infoSoft: "var(--info-soft)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        cardHover: "var(--shadow-card-hover)",
      },
    },
  },
  plugins: [],
};
