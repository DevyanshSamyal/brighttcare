import type { Config } from "tailwindcss";

// Design tokens — "school health booklet" direction:
// a calm clinical palette (not the default cream/terracotta AI look),
// a serif "record" display face paired with an engineered sans for forms,
// and a mono face for IDs / numeric readings (roll no., BP, pulse, BMI).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F7F6", // page background — cool neutral, not cream
        card: "#FFFFFF",
        ink: "#16232A", // primary text
        "ink-soft": "#4A5B62", // secondary text
        mist: "#E4E9E8", // borders / hairlines
        "mist-dark": "#CBD5D3",
        pine: {
          DEFAULT: "#0F6B5C", // brand / complete state
          dark: "#0A4F44",
          light: "#E4F0EC",
        },
        amber: {
          DEFAULT: "#B7791F", // pending state
          light: "#FBF0DD",
        },
        rose: {
          DEFAULT: "#B3261E", // required / error
          light: "#FBE9E7",
        },
        slate: {
          DEFAULT: "#5B6B72", // absent state
          light: "#EEF2F2",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 35, 42, 0.06), 0 1px 8px rgba(22, 35, 42, 0.04)",
        raised: "0 2px 6px rgba(22, 35, 42, 0.10), 0 8px 24px rgba(22, 35, 42, 0.06)",
      },
      letterSpacing: {
        wideish: "0.02em",
      },
    },
  },
  plugins: [],
};
export default config;
