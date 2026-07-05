import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth-context";
import { api, ApiError } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";
import { getCurrentPosition } from "../../src/lib/location-tracker";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes: string;
  work_location?: "shop" | "field" | "warehouse";
}

const WORK_LOCATIONS = [
  { key: "shop", label: "At Shop", icon: "storefront-outline" as const },
  { key: "field", label: "Field Work", icon: "map-marker-outline" as const },
  { key: "warehouse", label: "At Warehouse", icon: "warehouse" as const },
] as const;

export default function AttendanceScreen() {
  const { user } = useAuth();
  const topInset = useTopInset();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workLocation, setWorkLocation] = useState<"shop" | "field" | "warehouse">("shop");

  const todayStr = new Date().toISOString().slice(0, 10);

  const checkTodayAttendance = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: AttendanceRecord[] }>("/attendance");
      const todayRecordFound = (res.data ?? []).find((r) => r.date.startsWith(todayStr));
      if (todayRecordFound) {
        setIsCheckedIn(true);
        setTodayRecord(todayRecordFound);
      } else {
        setIsCheckedIn(false);
        setTodayRecord(null);
      }
    } catch (e) {
      console.error("Failed to check attendance:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTodayAttendance();
  }, [user]);

  const handleCheckIn = async () => {
    if (!user?.company_id || !user?.id) return;
    setSubmitting(true);
    try {
      // GPS is only meaningful for field work — a shop/warehouse check-in
      // still records the location if available, but doesn't require it.
      const position = await getCurrentPosition();
      const locationLabel = WORK_LOCATIONS.find((l) => l.key === workLocation)?.label ?? "At Shop";
      const res = await api.post<{ data: AttendanceRecord }>("/attendance/check-in", {
        notes: `Checked in — ${locationLabel}`,
        isRemote: workLocation === "field",
        workLocation,
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });
      Alert.alert("Success", "Attendance checked in successfully for today!");
      setIsCheckedIn(true);
      setTodayRecord(res.data);
    } catch (e) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Failed to check in attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark px-6" style={{ paddingTop: topInset }}>
      {/* Title */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
          Remote Attendance
        </Text>
        <Text className="text-sm text-text-secondary dark:text-text-secondary-dark font-medium mt-0.5">
          Verify and check-in daily duty attendance records
        </Text>
      </View>

      {/* Date Card */}
      <View className="bg-surface dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6 text-center items-center">
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-wider">
          Today's Date
        </Text>
        <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark mt-2">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      {/* Status details */}
      {loading ? (
        <View className="py-20 justify-center items-center">
          <ActivityIndicator size="large" color="#0F7A5F" />
        </View>
      ) : isCheckedIn ? (
        <View className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 p-6 rounded-3xl shadow-sm items-center">
          <View className="w-12 h-12 bg-green-500 rounded-full justify-center items-center mb-4">
            <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
          </View>
          <Text className="text-lg font-bold text-green-800 dark:text-green-400">
            Checked In Present
          </Text>
          <Text className="text-base text-green-600 dark:text-green-500 mt-1 font-medium text-center">
            Duty status is registered for today.{"\n"}Thank you and have a productive day!
          </Text>
          {todayRecord?.notes && (
            <Text className="text-sm text-green-700 dark:text-green-500 mt-4 italic font-semibold">
              Note: {todayRecord.notes}
            </Text>
          )}
        </View>
      ) : (
        <View className="bg-surface dark:bg-surface-dark border border-gray-150 dark:border-zinc-850 p-6 rounded-3xl shadow-lg items-center">
          <View className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full justify-center items-center mb-4">
            <MaterialCommunityIcons name="close" size={22} color="#EF4444" />
          </View>
          <Text className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
            Not Checked In
          </Text>
          <Text className="text-base text-text-secondary mt-1 font-medium text-center mb-6">
            You have not recorded attendance check-in for today yet.
          </Text>

          <Text className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 self-start">
            Where are you working today?
          </Text>
          <View className="w-full flex-row mb-6" style={{ gap: 8 }}>
            {WORK_LOCATIONS.map((loc) => (
              <Pressable
                key={loc.key}
                onPress={() => setWorkLocation(loc.key)}
                className={`flex-1 py-3 rounded-2xl items-center border ${
                  workLocation === loc.key
                    ? "bg-primary dark:bg-primary-dark border-primary"
                    : "bg-background dark:bg-background-dark border-gray-200 dark:border-zinc-800"
                }`}
              >
                <MaterialCommunityIcons
                  name={loc.icon}
                  size={20}
                  color={workLocation === loc.key ? "#FFFFFF" : "#6B7280"}
                />
                <Text
                  className={`text-xs font-bold mt-1 text-center ${
                    workLocation === loc.key ? "text-white" : "text-text-secondary"
                  }`}
                >
                  {loc.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleCheckIn}
            disabled={submitting}
            className="w-full bg-primary dark:bg-primary-dark py-5 rounded-2xl items-center active:opacity-95 shadow-md"
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg uppercase tracking-wider">
                Log Check-In
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
