/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media", // system-following; manual override handled via NativeWind's colorScheme API later
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Same tokens as shopkeeper-app (Stitch Design Brief §2) — duplicated
      // deliberately since these are two independent products, not one codebase.
      // Brand palette: #004CFA deep blue / #0368FE bright blue (primary,
      // light theme) / #000D3A navy / #03A8FE cyan-blue (primary, dark theme).
      colors: {
        background: { DEFAULT: "#FAF9F6", dark: "#141414" },
        surface: { DEFAULT: "#FFFFFF", dark: "#1F1F1F" },
        primary: { DEFAULT: "#0368FE", dark: "#03A8FE" },
        secondary: { DEFAULT: "#E8A33D", dark: "#F0AE4E" },
        "text-primary": { DEFAULT: "#1A1A1A", dark: "#F2F2F2" },
        "text-secondary": { DEFAULT: "#6B6B6B", dark: "#A0A0A0" },
        success: { DEFAULT: "#2E9E5B" },
        warning: { DEFAULT: "#E8A33D" },
        error: { DEFAULT: "#D64545" },
        info: { DEFAULT: "#0368FE" },
      },
      // "Gilroy" matches the family name registered via expo-font (see
      // src/lib/fonts.ts) — a no-op stub until real Gilroy font files are
      // supplied, since RN's require() on a missing asset breaks the bundle.
      fontFamily: {
        sans: ["Gilroy"],
      },
    },
  },
  plugins: [],
};
