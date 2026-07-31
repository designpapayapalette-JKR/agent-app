# agent-app

**MMC ERP** field-staff mobile app — branded "MMC Agent" in-app — phone-only,
deliberately minimal (Expo + React Native + Expo Router + NativeWind). Part
of the ManageMyCounter (MMC) platform. (Repo name is a pre-rebrand holdover
— see the workspace root [README](../README.md#a-note-on-naming).)

Hand-scaffolded rather than generated via `create-expo-app`, since Node wasn't available at scaffold time. Before first run:

```bash
npm install
npx expo install --fix   # reconciles dependency versions against your installed Expo SDK
cp .env.example .env     # point EXPO_PUBLIC_API_URL at your shopkeeper-backend instance
npx expo start --dev-client
```

**Why a dev client, not Expo Go:** background location tracking needs a custom native module — Expo Go can't load it past the prototype stage.

## Structure

- `app/` — Expo Router routes: `(auth)/login`, `(tabs)/{index,attendance,tasks,expenses,profile,location-permission}`
- `src/theme/colors.ts` — same Stitch color tokens as `shopkeeper-app` (duplicated deliberately, not shared-packaged — two independent products)
- `src/lib/api.ts` — API client for shopkeeper-api, reads `EXPO_PUBLIC_API_URL`
- `src/components/` — shared UI components

## Not installed yet

`expo-location` (background), `expo-camera`, and `expo-image-picker` (expense slip uploads) are added when each feature is actually built (Phase 3), not during scaffolding.

## Design note

This app is intentionally shallow — a single bottom tab bar, no tablet layout, no deep navigation. Resist adding more screens or nav depth here; that tradeoff is deliberate (see build doc §2.1).
