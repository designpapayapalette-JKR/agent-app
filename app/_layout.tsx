/**
 * app/_layout.tsx — Employee App root layout
 *
 * Responsibilities:
 *  1. Wrap the entire app in AuthProvider
 *  2. Guard navigation: unauthenticated → login, authenticated → tabs
 *  3. On login: check location permission and start background tracker
 *  4. On logout: stop the background tracker
 *
 * NOTE: importing location-tracker here at the module level registers the
 * TaskManager background task before any component renders — this is required
 * by expo-task-manager (task must be defined at the top level, not lazily).
 */
import "../global.css";
// Side-effect import: registers the LOCATION_TASK_NAME TaskManager task
import "../src/lib/location-tracker";
import React, { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colorScheme } from "nativewind";
import type * as LocationTypes from "expo-location";
import { AuthProvider, useAuth } from "../src/lib/auth-context";
import { safeRequireExpoLocation } from "../src/lib/isExpoGo";
import {
  startTracking,
  stopTracking,
  isTracking,
} from "../src/lib/location-tracker";
import { TerminologyProvider } from "../src/lib/terminology-context";
import { syncQueuedData } from "../src/lib/offlineQueue";

// Light-theme only, same as shopkeeper-app — overrides NativeWind's "media"
// (system) mode so the UI doesn't break on devices with system dark mode on.
colorScheme.set("light");

function NavigationGuard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const prevAuthenticated = useRef<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  // Sync offline queued attendance/expenses when returning online
  useEffect(() => {
    if (!isAuthenticated) return;
    syncQueuedData().catch(() => {});
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        syncQueuedData().catch(() => {});
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
      return;
    }

    // ── Handle tracker start/stop on auth state transitions ──
    const justLoggedIn =
      isAuthenticated && prevAuthenticated.current === false;
    const justLoggedOut =
      !isAuthenticated && prevAuthenticated.current === true;

    if (justLoggedIn && user?.id && user?.company_id) {
      // Check if background permission already granted; if not, show the
      // permission screen before sending the user to the home tab.
      (async () => {
        try {
          const Location = safeRequireExpoLocation();
          const bgStatus = Location
            ? (await Location.getBackgroundPermissionsAsync()).status
            : "denied";

          if (bgStatus === "granted") {
            // Permission already granted in a prior session — start silently
            await startTracking(user.id, user.company_id);
          } else {
            // Route to the permission/onboarding screen first
            // Only do this if we're not already on it
            const onPermissionScreen = segments[0] === "location-permission";
            if (!onPermissionScreen) {
              router.push("/location-permission");
            }
          }
        } catch {
          // expo-location not available in Expo Go — silently skip
        }
      })();
    }

    if (justLoggedOut) {
      stopTracking().catch(() => {});
    }

    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#0F7A5F" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TerminologyProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <NavigationGuard />
        </AuthProvider>
      </TerminologyProvider>
    </SafeAreaProvider>
  );
}

