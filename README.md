# agent-app

Field agent-facing app — phone-only, deliberately minimal (Expo + React Native + Expo Router + NativeWind). See the [master build doc](../Shopkeeper-ERP-App-Master-Build-Document.md) §5 and [Stitch Design Brief](../Stitch-Design-Brief.md) Part B (§5B).

Hand-scaffolded rather than generated via `create-expo-app`, since Node wasn't available at scaffold time. Before first run:

```bash
npm install
npx expo install --fix   # reconciles dependency versions against your installed Expo SDK
cp .env.example .env     # point EXPO_PUBLIC_API_URL at your shopkeeper-backend instance
npx expo start --dev-client
```

**Why a dev client, not Expo Go:** background location tracking and WebRTC (LiveKit walkie-talkie) both need custom native modules — Expo Go can't load them past the prototype stage.

## Structure

- `app/` — Expo Router routes: `(auth)/login`, `(tabs)/{index,attendance,tasks,walkie-talkie,expenses,profile}` — placeholders only, wired up per Phase 3 of the roadmap
- `src/theme/colors.ts` — same Stitch color tokens as `shopkeeper-app` (duplicated deliberately, not shared-packaged — two independent products)
- `src/lib/directus.ts` — Directus SDK client stub, reads `EXPO_PUBLIC_API_URL`
- `src/components/` — shared UI components

## Not installed yet

`expo-location` (background), `expo-camera`, the LiveKit RN client SDK, and `expo-image-picker` (expense slip uploads) are added when each feature is actually built (Phase 3), not during scaffolding.

## Design note

This app is intentionally shallow — a single bottom tab bar, no tablet layout, no deep navigation. Resist adding more screens or nav depth here; that tradeoff is deliberate (see build doc §2.1).
