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
        // SocialGo Brand Colors (glassmorphism palette)
        rose: {
          DEFAULT: "#FFB5C8",
          deep: "#FF8FAD",
        },
        peach: {
          DEFAULT: "#FFD4B8",
          deep: "#FFBA8A",
        },
        lavender: {
          DEFAULT: "#E8D5FF",
        },
        cream: {
          DEFAULT: "#FFF8F3",
        },
        sand: {
          DEFAULT: "#F5EDE4",
        },
        // Semantic
        "sg-bg": "#FFF8F3",
        "sg-glass": "rgba(255,255,255,0.55)",
        "sg-text": "#2A1F1A",
        "sg-text-mid": "#7A6560",
        "sg-text-light": "#B8A9A4",
        "sg-border": "rgba(255,180,150,0.25)",
        // Status
        "sg-success": "#B8E8C8",
        "sg-success-text": "#2D6B47",
        "sg-warning": "#FFE5B0",
        "sg-warning-text": "#8A5A00",
        "sg-danger": "#FFD0D8",
        "sg-danger-text": "#8A1F35",
      },
      fontFamily: {
        display: [
          "Fraunces",
          "Georgia",
          "serif",
        ],
        sans: [
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          "DM Mono",
          "SF Mono",
          "Fira Code",
          "monospace",
        ],
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
        lg: "18px",
        xl: "24px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(200,120,100,0.10)",
        card: "0 2px 16px rgba(200,120,100,0.08)",
        glow: "0 4px 16px rgba(255,143,173,0.35)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
