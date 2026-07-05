import React, { useState } from "react";
import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type * as LocationTypes from "expo-location";
import { startTracking } from "../../src/lib/location-tracker";
import { useAuth } from "../../src/lib/auth-context";
import { safeRequireExpoLocation } from "../../src/lib/isExpoGo";
import { useTopInset } from "../../src/lib/useTopInset";

/**
 * One-time location permission consent screen.
 *
 * Shown by the root _layout.tsx when:
 *   - The user is authenticated, AND
 *   - Background location permission has not yet been granted.
 *
 * After the user grants permission (or skips), navigation moves to the
 * main tab home screen and this screen is never shown again (the root
 * layout checks the permission status on each app launch).
 */
export default function LocationPermissionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const topInset = useTopInset(40);
  const [requesting, setRequesting] = useState(false);

  const handleGrant = async () => {
    const Location = safeRequireExpoLocation();
    if (!Location) {
      Alert.alert(
        "Not Available in Expo Go",
        "Background location tracking needs the full app build. Tap Skip for now — the rest of the app still works.",
        [{ text: "OK" }]
      );
      return;
    }

    setRequesting(true);
    try {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Foreground location access is required to mark attendance and coordinate deliveries. Please allow it in your device settings.",
          [{ text: "OK" }]
        );
        setRequesting(false);
        return;
      }

      // Request background permission (iOS will show a second system dialog)
      await Location.requestBackgroundPermissionsAsync();

      // Start tracking if we have a valid user session
      if (user?.id && user?.company_id) {
        await startTracking(user.id, user.company_id);
      }

      router.replace("/(tabs)");
    } catch (e) {
      console.error("Permission request failed:", e);
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    // User declines — they can still use the app, tracking just won't work
    router.replace("/(tabs)");
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View className="flex-1 px-8 pb-12 justify-between" style={{ paddingTop: topInset }}>
        {/* ── Top Illustration Area ── */}
        <View className="items-center mb-8">
          {/* Map pin illustration */}
          <View className="w-32 h-32 rounded-full bg-primary/10 dark:bg-primary-dark/15 justify-center items-center mb-6 border-2 border-primary/20 dark:border-primary-dark/25">
            <MaterialCommunityIcons name="map-marker" size={56} color="#0F7A5F" />
          </View>

          <Text className="text-3xl font-black text-text-primary dark:text-text-primary-dark text-center leading-tight mb-3">
            Enable Location{"\n"}Tracking
          </Text>

          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark text-center leading-relaxed">
            Your manager uses your location to coordinate field operations,
            assign nearby tasks, and verify remote attendance check-ins.
          </Text>
        </View>

        {/* ── Transparent "why" bullets ── */}
        <View className="bg-surface dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 mb-8 gap-4">
          {[
            {
              icon: "map" as const,
              title: "Live coordination",
              body: "Your manager sees your position on a map to assign nearby tasks.",
            },
            {
              icon: "clipboard-text" as const,
              title: "Attendance verification",
              body: "Remote check-ins are stamped with your GPS location for accuracy.",
            },
            {
              icon: "lock" as const,
              title: "Only while on duty",
              body: "Tracking runs while you are logged in. Logging out stops it immediately.",
            },
            {
              icon: "shield-check" as const,
              title: "Data stays in-house",
              body: "Pings go to your company's own server — no third-party tracking.",
            },
          ].map((item) => (
            <View key={item.title} className="flex-row gap-4 items-start">
              <View className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary-dark/15 justify-center items-center flex-shrink-0">
                <MaterialCommunityIcons name={item.icon} size={20} color="#0F7A5F" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-0.5">
                  {item.title}
                </Text>
                <Text className="text-xs text-text-secondary leading-relaxed">
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA buttons ── */}
        <View className="gap-3">
          <Pressable
            onPress={handleGrant}
            disabled={requesting}
            className="bg-primary dark:bg-primary-dark py-4 rounded-2xl items-center shadow-md active:opacity-90"
          >
            {requesting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-widest">
                Grant Location Access
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={requesting}
            className="py-3.5 rounded-2xl items-center active:opacity-70"
          >
            <Text className="text-text-secondary font-semibold text-sm">
              Skip for now
            </Text>
          </Pressable>

          <Text className="text-center text-text-secondary text-[10px] leading-relaxed px-4">
            You can change this at any time in your device's{" "}
            Settings → Apps → Employee App → Permissions.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
