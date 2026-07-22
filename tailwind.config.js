/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media", // system-following; RN has no "class" toggle mechanism like the web export
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Ported 1:1 from shopkeeper-app/tailwind.config.js (MMC rebrand pass)
      // so components shared between the two apps (src/components/*) don't
      // need per-app class-name translation. Brand palette (managemycounter,
      // all products): #004CFA deep blue, #0368FE bright blue (primary),
      // #000D3A navy, #03A8FE cyan-blue (dark-mode primary / accent).
      colors: {
        "tertiary-container": "#a5544a",
        "on-tertiary-container": "#ffe9e6",
        "secondary-dark": "#F0AE4E",
        "secondary-fixed": "#ffddb5",
        "error-container": "#ffdad6",
        "on-tertiary": "#ffffff",
        "on-tertiary-fixed": "#3d0604",
        "inverse-surface": "#313030",
        "on-secondary-fixed": "#2a1800",
        success: "#2E9E5B",
        "surface-dark": "#1F1F1F",
        background: "#fcf9f8",
        "inverse-primary": "#03A8FE",
        "secondary-container": "#feb64e",
        "surface-container-highest": "#e5e2e1",
        "on-error": "#ffffff",
        "surface-tint": "#0368FE",
        info: "#0368FE",
        "text-secondary-dark": "#A0A0A0",
        "inverse-on-surface": "#f3f0ef",
        "tertiary-fixed-dim": "#ffb4aa",
        "on-error-container": "#93000a",
        surface: "#fcf9f8",
        "surface-container-low": "#f6f3f2",
        "on-primary-fixed-variant": "#000D3A",
        navy: "#000D3A",
        "surface-variant": "#e5e2e1",
        "on-surface": "#1c1b1b",
        "on-secondary": "#ffffff",
        "on-primary-container": "#d9e8ff",
        "on-surface-variant": "#3e4944",
        "on-secondary-fixed-variant": "#643f00",
        "primary-fixed-dim": "#03A8FE",
        "primary-dark": "#03A8FE",
        "on-tertiary-fixed-variant": "#773129",
        "surface-container-lowest": "#ffffff",
        primary: "#0368FE",
        "outline-variant": "#bdc9c2",
        "text-primary-dark": "#F2F2F2",
        "surface-bright": "#fcf9f8",
        outline: "#6e7a74",
        "surface-container": "#f0eded",
        secondary: "#835400",
        "on-primary-fixed": "#000D3A",
        "tertiary-fixed": "#ffdad5",
        "text-secondary-light": "#6B6B6B",
        "on-background": "#1c1b1b",
        "bg-dark": "#141414",
        "primary-container": "#004CFA",
        "surface-light": "#FFFFFF",
        "secondary-fixed-dim": "#ffb956",
        error: "#D64545",
        "on-secondary-container": "#714800",
        "surface-dim": "#dcd9d9",
        "on-primary": "#ffffff",
        "bg-light": "#FAF9F6",
        "primary-fixed": "#d9e8ff",
        "surface-container-high": "#eae7e7",
        tertiary: "#873d34",
        // Role badge colors — shopkeeper-mobile-design-system.md §4.1.
        // Deliberately distinct per role so a shared-device handoff (e.g.
        // owner unlocking the phone for a cashier) is identifiable at a
        // glance without reading the label. Previously absent in this app.
        "role-owner": "#0368FE",
        "role-manager": "#feb64e",
        "role-staff": "#2E9E5B",
        "role-warehouse": "#873d34",
        // Compat aliases: pre-existing agent-app screens (index.tsx,
        // tasks.tsx, profile.tsx, attendance.tsx, expenses.tsx) reference
        // `text-text-primary`/`text-text-secondary` from the app's old,
        // now-replaced token set. Kept as-is (not remapped to on-surface/
        // on-surface-variant) so nothing shifts visually until the Phase 5
        // redesign pass deliberately touches these screens.
        "text-primary": { DEFAULT: "#1A1A1A", dark: "#F2F2F2" },
        "text-secondary": { DEFAULT: "#6B6B6B", dark: "#A0A0A0" },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "margin-mobile": "16px",
        xl: "32px",
        lg: "24px",
        unit: "4px",
        "margin-tablet": "32px",
        md: "16px",
        gutter: "16px",
        xs: "4px",
        "touch-target": "44px",
        sm: "8px",
      },
      // Family names match what src/lib/fonts.ts registers via expo-font
      // (Poppins, full weight range via @expo-google-fonts/poppins).
      fontFamily: {
        "headline-md": ["Poppins_600SemiBold"],
        "body-lg": ["Poppins_400Regular"],
        caption: ["Poppins_400Regular"],
        "headline-lg": ["Poppins_600SemiBold"],
        "numeric-emphasis": ["Poppins_600SemiBold"],
        "headline-sm": ["Poppins_600SemiBold"],
        "label-md": ["Poppins_500Medium"],
        "label-sm": ["Poppins_500Medium"],
        "display-lg": ["Poppins_700Bold"],
        "display-md": ["Poppins_700Bold"],
        "body-md": ["Poppins_400Regular"],
        // Legacy tokens some existing agent-app screens already reference
        // (src/lib/fonts.ts registers these same Poppins weights) — kept so
        // this migration doesn't break pre-existing screens in one pass.
        sans: ["Poppins_400Regular"],
        heading: ["Poppins_700Bold"],
      },
      fontSize: {
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "numeric-emphasis": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "label-md": [
          "14px",
          { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" },
        ],
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "display-lg": [
          "40px",
          { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-md": ["32px", { lineHeight: "38px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
};
