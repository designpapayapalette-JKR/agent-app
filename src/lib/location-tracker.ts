/**
 * location-tracker.ts
 *
 * Background GPS location tracking service for MMC Agent.
 *
 * Architecture:
 *  - Uses expo-task-manager to register a named background task
 *    (LOCATION_TASK_NAME) that fires whenever expo-location delivers
 *    a new position update — even when the app is backgrounded.
 *  - Each update POSTs to the shopkeeper-api `/agent-locations` endpoint,
 *    which derives the agent/company from the JWT rather than trusting
 *    client-supplied IDs.
 *  - Tracking only starts after the user has been authenticated and has
 *    granted background location permission. The app's root _layout.tsx
 *    calls startTracking() on login and stopTracking() on logout.
 *
 * Expo Go note: expo-location's and expo-task-manager's native modules
 * ("ExpoLocation", "ExpoTaskManager") aren't bundled in Expo Go — merely
 * `import`-ing either package at the top level crashes the whole app
 * immediately on load. Both are require()'d lazily via
 * requireNativeModuleSafe(), which is Expo-Go-aware AND wraps the require()
 * in try/catch as a safety net (see src/lib/isExpoGo.ts) — so even if the
 * Expo Go detection itself is ever wrong, a missing native module degrades
 * to "feature unavailable" instead of crashing. This file must not
 * statically `import` either package.
 *
 * To activate full audio + location in native:
 *  - Build with EAS: `eas build --profile development --platform android`
 *  - Add the background location permission to app.json (see below).
 *
 * app.json additions needed:
 *   "expo": {
 *     "android": {
 *       "permissions": ["ACCESS_BACKGROUND_LOCATION", "ACCESS_FINE_LOCATION"]
 *     },
 *     "ios": {
 *       "infoPlist": {
 *         "NSLocationAlwaysAndWhenInUseUsageDescription":
 *           "This app tracks your location while on duty so your manager can coordinate field operations.",
 *         "NSLocationWhenInUseUsageDescription":
 *           "This app uses your location for attendance and task coordination.",
 *         "UIBackgroundModes": ["location"]
 *       }
 *     }
 *   }
 */

import type * as LocationTypes from "expo-location";
import type * as TaskManagerTypes from "expo-task-manager";
import { api } from "./api";
import { safeRequireExpoLocation, safeRequireExpoTaskManager } from "./isExpoGo";

export const LOCATION_TASK_NAME = "agent-location-background-task";

// Configurable ping interval (milliseconds between GPS updates)
const PING_INTERVAL_MS = 60_000; // 60 seconds
const PING_DISTANCE_M = 50; // also trigger if moved > 50m

// Module-level state (not persisted across app kills)
let _userId: string | null = null;
let _companyId: string | null = null;
let _isTracking = false;

export function isTracking(): boolean {
  return _isTracking;
}

const TaskManager = safeRequireExpoTaskManager();

if (TaskManager) {
  // Registration must still happen at module scope (not inside a function)
  // so expo-task-manager can find the task definition on launch.
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.error("[LocationTracker] Background task error:", error.message);
      return;
    }
    if (!data) return;

    const { locations } = data as { locations: LocationTypes.LocationObject[] };
    if (!locations?.length) return;

    const loc = locations[locations.length - 1]; // take the most recent ping

    if (!_userId || !_companyId) {
      // Auth context not ready — skip this ping, will resume next cycle
      console.warn("[LocationTracker] No user/company in context — skipping ping.");
      return;
    }

    try {
      await api.post("/agent-locations", {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: new Date(loc.timestamp).toISOString(),
      });
    } catch (e) {
      // Don't throw — a failed ping shouldn't crash the background task
      console.error("[LocationTracker] Failed to POST location ping:", e);
    }
  });
}

/**
 * Requests the necessary permissions and starts background location updates.
 *
 * @param userId    Directus user ID of the currently-logged-in agent
 * @param companyId The agent's company_id (for tenant scoping)
 */
export async function startTracking(
  userId: string,
  companyId: string
): Promise<{ success: boolean; reason?: string }> {
  const Location = safeRequireExpoLocation();
  if (!Location) {
    return { success: false, reason: "native_module_unavailable" };
  }

  _userId = userId;
  _companyId = companyId;

  try {
    // 1. Check foreground permission
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      return { success: false, reason: "foreground_permission_denied" };
    }

    // 2. Check background permission (required for updates when app is backgrounded)
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      // Fall back to foreground-only tracking (still useful when app is open)
      console.warn(
        "[LocationTracker] Background permission denied — foreground-only tracking active."
      );
    }

    // 3. Avoid double-starting
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    ).catch(() => false);

    if (alreadyStarted) {
      _isTracking = true;
      return { success: true };
    }

    // 4. Start background updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: PING_INTERVAL_MS,
      distanceInterval: PING_DISTANCE_M,
      showsBackgroundLocationIndicator: true, // iOS: shows the blue bar
      foregroundService: {
        // Android: keeps the task alive
        notificationTitle: "MMC Agent",
        notificationBody: "Location tracking is active while on duty.",
        notificationColor: "#0F7A5F",
      },
    });

    _isTracking = true;
    return { success: true };
  } catch (e) {
    console.error("[LocationTracker] Failed to start tracking:", e);
    return { success: false, reason: "start_failed" };
  }
}

/**
 * Stops background location updates and clears the cached user/company.
 */
export async function stopTracking(): Promise<void> {
  _userId = null;
  _companyId = null;
  _isTracking = false;

  const Location = safeRequireExpoLocation();
  if (!Location) return;

  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    ).catch(() => false);

    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (e) {
    console.error("[LocationTracker] Failed to stop tracking:", e);
  }
}

/**
 * One-shot convenience: gets the current position without starting
 * continuous tracking. Used by the Home screen for the "last known" display.
 */
export async function getCurrentPosition(): Promise<LocationTypes.LocationObject | null> {
  const Location = safeRequireExpoLocation();
  if (!Location) return null;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }
}
