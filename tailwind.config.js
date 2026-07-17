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
      // Family names match what src/lib/fonts.ts registers via expo-font.
      // Only 2 real weights exist (Light 300, ExtraBold 800 — free tier).
      // "sans" (body default) uses Light; "heading" (ExtraBold) is
      // available for headings/emphasis via font-heading.
      fontFamily: {
        sans: ["Gilroy-Light"],
        heading: ["Gilroy-ExtraBold"],
      },
    },
  },
  plugins: [],
};
