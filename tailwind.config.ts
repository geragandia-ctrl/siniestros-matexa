import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:    "#063940",
          medium:  "#195e63",
          accent:  "#3e838c",
          light:   "#eaf4f4",
          success: "#0DBF7E",
        },
        neutral: {
          900:       "#0F1623",
          bg:        "#F7F8FA",
          border:    "#E2E6EC",
          secondary: "#8896A8",
        },
        state: {
          warning: "#F5962A",
          error:   "#E8404A",
          special: "#7C3AED",
        },
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        dm:   ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;