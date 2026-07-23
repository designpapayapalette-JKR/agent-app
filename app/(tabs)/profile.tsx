import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/lib/auth-context";
import { api } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";
import { useTerminology } from "../../src/lib/terminology-context";
import { roleLabel, roleColor } from "../../src/lib/roles";

const APP_VERSION = "1.0.0-alpha";

interface MonthlyStats {
  daysPresent: number;
  expensesSubmitted: number;
  expensesTotal: number;
  tasksCompleted: number;
}

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "A";
}

function capitalize(s: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export default function ProfileScreen() {
  const { user, activeCompany, logout } = useAuth();
  const { lang, setLang, t } = useTerminology();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const topInset = useTopInset();
  const [stats, setStats] = useState<MonthlyStats>({
    daysPresent: 0,
    expensesSubmitted: 0,
    expensesTotal: 0,
    tasksCompleted: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .slice(0, 10);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [attRes, expRes, taskRes] = await Promise.all([
        api.get<{ data: any[] }>("/attendance").catch(() => ({ data: [] })),
        api.get<{ data: any[] }>("/expenses").catch(() => ({ data: [] })),
        api.get<{ data: any[] }>("/agent-tasks").catch(() => ({ data: [] })),
      ]);

      const daysPresent = (attRes.data ?? []).filter(
        (a) => a.date >= monthStart && a.status === "present"
      ).length;

      const monthExpenses = (expRes.data ?? []).filter((e) => e.date >= monthStart);
      const expCount = monthExpenses.length;
      const expTotal = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

      const tasksDone = (taskRes.data ?? []).filter((t) => t.status === "done").length;

      setStats({
        daysPresent,
        expensesSubmitted: expCount,
        expensesTotal: expTotal,
        tasksCompleted: tasksDone,
      });
    } catch (e) {
      console.error("Failed to load profile stats:", e);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const handleDeleteAccount = () => {
    const isHindi = t("staff")?.includes("कामगार");
    Alert.alert(
      isHindi ? "खाता हटाने का अनुरोध?" : "Delete my account?",
      isHindi
        ? "हम आपका व्यक्तिगत लॉगिन डेटा 30 दिनों के भीतर हटा देंगे। यह आपकी कंपनी के व्यावसायिक रिकॉर्ड को नहीं हटाएगा।"
        : "We'll remove your personal login and profile data within 30 days. This won't delete your company's business records.",
      [
        { text: isHindi ? "रद्द करें" : "Cancel", style: "cancel" },
        {
          text: isHindi ? "अनुरोध भेजें" : "Request Deletion",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.post("/account/deletion-request", {
                name: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "MMC Agent user",
                email: user?.email,
                scope: "own_account",
                reason: "Requested from the MMC Agent mobile app (Profile > Delete My Account).",
              });
              Alert.alert(
                isHindi ? "अनुरोध प्राप्त हुआ" : "Request received",
                isHindi ? "हमने आपको एक पुष्टिकरण ईमेल भेजा है।" : "We've emailed you a confirmation. Your data will be processed within 30 days."
              );
            } catch (e) {
              Alert.alert(
                isHindi ? "कुछ गलत हो गया" : "Something went wrong",
                isHindi ? "कृपया फिर से प्रयास करें।" : "Please try again, or email hello@managemycounter.com directly."
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t("staff")?.includes("कामगार") ? "लॉग आउट" : "Sign Out",
      t("staff")?.includes("कामगार") ? "क्या आप वाकई MMC Agent से साइन आउट करना चाहते हैं?" : "Are you sure you want to sign out of MMC Agent?",
      [
        { text: t("staff")?.includes("कामगार") ? "रद्द करें" : "Cancel", style: "cancel" },
        {
          text: t("staff")?.includes("कामगार") ? "लॉग आउट" : "Sign Out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch (e) {
              console.error("Logout error:", e);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={["#0368FE", "#000D3A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: topInset, alignItems: "center", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", top: -50, right: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <View style={{ position: "absolute", bottom: -40, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(3,168,254,0.16)" }} />
        {/* Avatar */}
        <View className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 justify-center items-center mb-4">
          <Text className="text-white font-black text-3xl">
            {getInitials(user?.first_name, user?.last_name)}
          </Text>
        </View>

        {/* Name */}
        <Text className="text-white text-2xl font-black text-center">
          {user?.first_name ?? ""} {user?.last_name ?? ""}
        </Text>
        <Text className="text-white/70 text-sm text-center mt-0.5">
          {user?.email ?? ""}
        </Text>

        {/* Role + Company */}
        <View className="flex-row gap-2 mt-3 flex-wrap justify-center">
          {user?.role && (
            <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: roleColor(user.role), fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {roleLabel(user.role)}
              </Text>
            </View>
          )}
          {activeCompany?.name && (
            <View className="bg-white/10 px-3 py-1.5 rounded-full border border-white/15 flex-row items-center" style={{ gap: 5 }}>
              <MaterialCommunityIcons name="office-building" size={14} color="#FFFFFF" style={{ opacity: 0.8 }} />
              <Text className="text-white/80 text-sm font-semibold">
                {activeCompany.name}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View className="px-6 pt-6 pb-12">
        {/* ── This Month Stats ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "इस महीने की गतिविधियां" : "This Month's Activity"}
        </Text>

        {loadingStats ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 items-center mb-6">
            <ActivityIndicator size="small" color="#0368FE" />
          </View>
        ) : (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 mb-6 overflow-hidden">
            <View className="flex-row">
              {/* Days Present */}
              <View className="flex-1 p-4 items-center border-r border-gray-100 dark:border-zinc-800">
                <Text className="text-2xl font-black text-primary dark:text-primary-dark">
                  {stats.daysPresent}
                </Text>
                <Text className="text-[11px] text-text-secondary font-bold uppercase tracking-wide text-center mt-0.5">
                  {t("staff")?.includes("कामगार") ? "कुल हाजिरी" : "Days Present"}
                </Text>
              </View>
              {/* Tasks Done */}
              <View className="flex-1 p-4 items-center border-r border-gray-100 dark:border-zinc-800">
                <Text className="text-2xl font-black text-primary dark:text-primary-dark">
                  {stats.tasksCompleted}
                </Text>
                <Text className="text-[11px] text-text-secondary font-bold uppercase tracking-wide text-center mt-0.5">
                  {t("staff")?.includes("कामगार") ? "कार्य पूर्ण" : "Tasks Done"}
                </Text>
              </View>
              {/* Expenses */}
              <View className="flex-1 p-4 items-center">
                <Text className="text-2xl font-black text-primary dark:text-primary-dark">
                  {stats.expensesSubmitted}
                </Text>
                <Text className="text-[11px] text-text-secondary font-bold uppercase tracking-wide text-center mt-0.5">
                  {t("expenses")?.includes("खर्चे") ? "कुल खर्चे" : "Expenses Filed"}
                </Text>
              </View>
            </View>

            {/* Expense total bar */}
            {stats.expensesTotal > 0 && (
              <View className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 flex-row items-center justify-between">
                <Text className="text-sm text-text-secondary font-semibold">
                  {t("expenses")?.includes("खर्चे") ? "दावा की गई कुल राशि" : "Total expense amount claimed"}
                </Text>
                <Text className="text-sm font-black text-text-primary dark:text-text-primary-dark">
                  ₹{stats.expensesTotal.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Account Info ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "खाता जानकारी" : "Account"}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 mb-6 overflow-hidden">
          {[
            { label: t("staff")?.includes("कामगार") ? "पूरा नाम" : "Full Name", value: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—" },
            { label: t("staff")?.includes("कामगार") ? "ईमेल" : "Email", value: user?.email ?? "—" },
            { label: t("staff")?.includes("कामगार") ? "पद (Role)" : "Role", value: user?.role ? roleLabel(user.role) : "—" },
            { label: t("staff")?.includes("कामगार") ? "कंपनी" : "Company", value: activeCompany?.name ?? "—" },
          ].map((row, idx, arr) => (
            <View
              key={row.label}
              className={`px-4 py-3.5 flex-row items-center justify-between ${
                idx < arr.length - 1
                  ? "border-b border-gray-100 dark:border-zinc-800"
                  : ""
              }`}
            >
              <Text className="text-sm font-semibold text-text-secondary">
                {row.label}
              </Text>
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark flex-1 text-right ml-4" numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── My Records ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "मेरे रिकॉर्ड्स" : "My Records"}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 mb-6 overflow-hidden">
          <Pressable
            onPress={() => router.push("/salary" as any)}
            className="px-4 py-3.5 flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800"
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#0368FE" />
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                {t("payroll")}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#9E9E9E" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/documents" as any)}
            className="px-4 py-3.5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#0368FE" />
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                {t("scannedDocs")}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#9E9E9E" />
          </Pressable>
        </View>

        {/* ── Settings / Language ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {lang === "hi" ? "सेटिंग्स और भाषा" : "Settings & Language"}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 mb-6 overflow-hidden p-4">
          <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-3">
            App Language
          </Text>
          <View className="flex-row flex-wrap bg-gray-50 dark:bg-zinc-900 p-1 rounded-xl" style={{ gap: 4 }}>
            {[
              { key: "en", label: "English" },
              { key: "hi", label: "हिंदी" },
              { key: "ta", label: "தமிழ்" },
              { key: "ml", label: "മലയാളം" },
              { key: "kn", label: "ಕನ್ನಡ" },
              { key: "te", label: "తెలుగు" },
              { key: "mr", label: "मराठी" },
              { key: "gu", label: "ગુજરાતી" },
            ].map((l) => (
              <Pressable
                key={l.key}
                onPress={() => setLang(l.key as any)}
                className={`py-2 px-3 rounded-lg items-center ${lang === l.key ? "bg-primary shadow-sm" : ""}`}
              >
                <Text className={`text-xs font-bold ${lang === l.key ? "text-white" : "text-text-primary"}`}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── App Info ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "ऐप जानकारी" : "App Info"}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 mb-6 overflow-hidden">
          {[
            { label: t("staff")?.includes("कामगार") ? "ऐप संस्करण" : "App Version", value: APP_VERSION },
            { label: t("staff")?.includes("कामगार") ? "प्लेटफॉर्म" : "Platform", value: "React Native (Expo)" },
            { label: t("staff")?.includes("कामगार") ? "थीम मोड" : "Color Scheme", value: capitalize(colorScheme ?? "system") },
          ].map((row, idx, arr) => (
            <View
              key={row.label}
              className={`px-4 py-3.5 flex-row items-center justify-between ${
                idx < arr.length - 1
                  ? "border-b border-gray-100 dark:border-zinc-800"
                  : ""
              }`}
            >
              <Text className="text-sm font-semibold text-text-secondary">
                {row.label}
              </Text>
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Logout ── */}
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl py-4 items-center flex-row justify-center gap-2 active:opacity-80"
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#D64545" />
          ) : (
            <>
              <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
              <Text className="text-red-600 dark:text-red-400 font-bold text-lg">
                {t("staff")?.includes("कामगार") ? "लॉग आउट करें" : "Sign Out"}
              </Text>
            </>
          )}
        </Pressable>

        {/* ── Delete Account ── */}
        <Pressable
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          className="mt-3 py-3 items-center flex-row justify-center gap-2 active:opacity-70"
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#D64545" />
          ) : (
            <>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
              <Text className="text-red-600 dark:text-red-400 font-semibold text-sm">
                {t("staff")?.includes("कामगार") ? "मेरा खाता हटाएं" : "Delete My Account"}
              </Text>
            </>
          )}
        </Pressable>

        <Text className="text-center text-text-secondary text-sm mt-4 font-medium">
          MMC Agent · v{APP_VERSION}
        </Text>
      </View>
    </ScrollView>
  );
}
