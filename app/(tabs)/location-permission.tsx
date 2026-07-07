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
import { startTracking } from "../../src/lib/location-tracker";
import { useAuth } from "../../src/lib/auth-context";
import { isExpoGo } from "../../src/lib/isExpoGo";
import { useTopInset } from "../../src/lib/useTopInset";
import { requestAppPermissions } from "../../src/lib/permissions";

export default function LocationPermissionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const topInset = useTopInset(40);
  const [requesting, setRequesting] = useState(false);

  const handleGrant = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Expo Go Limited Access",
        "Sensors, WiFi scanning, and background tracking require a native client build. Skips for now — other pages still work.",
        [{ text: "Skip", onPress: () => router.replace("/(tabs)") }]
      );
      return;
    }

    setRequesting(true);
    try {
      // Trigger dynamic permission requests for Location, Camera, Microphone, Bluetooth, Call Logs/Phone State, WiFi state
      const res = await requestAppPermissions();

      if (!res.locationForeground) {
        Alert.alert(
          "Foreground Location Required",
          "This app requires foreground location access to verify attendance check-ins and log dispatch coordinates.",
          [{ text: "OK" }]
        );
        setRequesting(false);
        return;
      }

      // Start tracking background tasks if logged in
      if (user?.id && user?.company_id) {
        await startTracking(user.id, user.company_id);
      }

      router.replace("/(tabs)");
    } catch (e) {
      console.error("Permission trigger failed:", e);
      setRequesting(false);
    }
  };

  const handleSkip = () => {
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
            <MaterialCommunityIcons name="shield-check-outline" size={56} color="#0F7A5F" />
          </View>

          <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark text-center leading-tight mb-3">
            Device Sensors &{"\n"}Location Consent
          </Text>

          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark text-center leading-relaxed">
            To coordinate delivery operations and calculate accurate mileage, we require access to device positioning sensors.
          </Text>
        </View>

        {/* ── Transparent "why" bullets ── */}
        <View className="bg-surface dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 mb-8 gap-4">
          {[
            {
              icon: "map-marker-radius" as const,
              title: "Location Tracking (GPS & WiFi)",
              body: "Coordinates active field duties, logs routing progression, and stamps attendance checkpoints.",
            },
            {
              icon: "phone-in-talk-outline" as const,
              title: "Cellular Call Logs & Diagnostics",
              body: "Used on Android to diagnose network cell towers and cell signal telemetry to verify accuracy when GPS is obstructed.",
            },
            {
              icon: "bluetooth-connect" as const,
              title: "Bluetooth scans",
              body: "Connects to nearby corporate attendance hubs and warehouse barcode ticket printers.",
            },
            {
              icon: "camera-outline" as const,
              title: "Camera & Audio sensors",
              body: "Allows capturing expense invoices, document wallet attachments, and streaming PTT walkie-talkie sound.",
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
                Accept and Continue
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
            You can revoke these permissions at any time in device system settings. We value your privacy.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
