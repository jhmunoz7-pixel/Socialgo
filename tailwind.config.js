/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SocialGo Brand Colors — Indigo/Violet palette
        rose: {
          DEFAULT: "#818CF8",
          deep: "#6366F1",
        },
        peach: {
          DEFAULT: "#A78BFA",
          deep: "#7C3AED",
        },
        lavender: {
          DEFAULT: "#C4B5FD",
        },
        cream: {
          DEFAULT: "#F8FAFC",
        },
        sand: {
          DEFAULT: "#E2E8F0",
        },
        // Semantic
        "sg-bg": "#F8FAFC",
        "sg-glass": "rgba(255,255,255,0.55)",
        "sg-text": "#0F172A",
        "sg-text-mid": "#64748B",
        "sg-text-light": "#94A3B8",
        "sg-border": "rgba(148,163,184,0.2)",
        // Status
        "sg-success": "#BBF7D0",
        "sg-success-text": "#166534",
        "sg-warning": "#FEF08A",
        "sg-warning-text": "#854D0E",
        "sg-danger": "#FECACA",
        "sg-danger-text": "#991B1B",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: [
          "DM Sans", "-apple-system", "BlinkMacSystemFont",
          '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif",
        ],
        mono: ["DM Mono", "SF Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-md": ["36px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-sm": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-lg": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-xs": ["11px", { lineHeight: "1.5", fontWeight: "500" }],
      },
      borderRadius: {
        none: "0",
        sm: "10px",
        md: "14px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(99,102,241,0.08)",
        card: "0 2px 16px rgba(99,102,241,0.05)",
        glow: "0 4px 16px rgba(99,102,241,0.25)",
        "hover-lift": "0 8px 30px rgba(99,102,241,0.10)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
