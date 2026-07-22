import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useAuth } from "../../src/lib/auth-context";
import { api } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";
import { useTerminology } from "../../src/lib/terminology-context";
import { getQueuedCount, syncQueuedData } from "../../src/lib/offlineQueue";

type MCIName = ComponentProps<typeof MaterialCommunityIcons>["name"];

interface DashboardStats {
  isCheckedInToday: boolean;
  pendingTasksCount: number;
  pendingExpensesCount: number;
  thisMonthExpenseTotal: number;
}

interface RecentActivity {
  id: string;
  type: "expense" | "attendance" | "task";
  label: string;
  sublabel: string;
  amount?: number;
  status?: string;
  date: string;
}

const QUICK_ACTIONS: { id: string; label: string; icon: MCIName; route: "/attendance" | "/expenses" | "/tasks" }[] = [
  { id: "attendance", label: "Check In", icon: "map-marker", route: "/attendance" },
  { id: "expenses", label: "Log Expense", icon: "receipt", route: "/expenses" },
  { id: "tasks", label: "My Tasks", icon: "check-circle", route: "/tasks" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "A";
}

export default function HomeScreen() {
  const { user, userRole, activeCompany } = useAuth();
  const { t } = useTerminology();
  const router = useRouter();
  const topInset = useTopInset();

  const [stats, setStats] = useState<DashboardStats>({
    isCheckedInToday: false,
    pendingTasksCount: 0,
    pendingExpensesCount: 0,
    thisMonthExpenseTotal: 0,
  });
  const [performance, setPerformance] = useState<{ completed: number; outcomes: Record<string, number> }>({
    completed: 0,
    outcomes: {},
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const checkSyncCount = useCallback(async () => {
    const count = await getQueuedCount();
    setPendingSyncCount(count);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Attendance/tasks/expenses list routes already scope to the calling
      // field_agent's own records server-side — no filter params needed.
      const [attendanceRes, tasksRes, expensesRes] = await Promise.all([
        api.get<{ data: any[] }>("/attendance"),
        api.get<{ data: any[] }>("/agent-tasks").catch(() => ({ data: [] })),
        api.get<{ data: any[] }>("/expenses").catch(() => ({ data: [] })),
      ]);

      const attendance = attendanceRes.data ?? [];
      const checkedIn = attendance.some((a) => a.date.startsWith(todayStr));

      const tasks = tasksRes.data ?? [];
      const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
      const completedThisMonth = tasks.filter((t) =>
        t.status === "done" && t.completedAt?.startsWith(monthStart.slice(0, 7))
      );
      const visitOutcomes = completedThisMonth.reduce((acc: Record<string, number>, t: any) => {
        const outcome = t.visitOutcome || "unknown";
        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
      }, {});

      const expenses = expensesRes.data ?? [];
      const monthExpenses = expenses.filter((e) => e.date >= monthStart);
      const pendingExpenses = monthExpenses.filter((e) => e.status === "submitted").length;
      const monthTotal = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

      setStats({
        isCheckedInToday: checkedIn,
        pendingTasksCount: pendingTasks,
        pendingExpensesCount: pendingExpenses,
        thisMonthExpenseTotal: monthTotal,
      });
      setPerformance({
        completed: completedThisMonth.length,
        outcomes: visitOutcomes,
      });

      // Recent activity — last 3 expenses + last 2 attendance records
      const activity: RecentActivity[] = [];
      expenses.slice(0, 3).forEach((e) => {
        activity.push({
          id: `exp-${e.id}`,
          type: "expense",
          label: `${capitalize(e.category)} expense`,
          sublabel: e.notes || "No description",
          amount: parseFloat(e.amount || "0"),
          status: e.status,
          date: e.date,
        });
      });
      attendance.slice(0, 2).forEach((a) => {
        activity.push({
          id: `att-${a.id}`,
          type: "attendance",
          label: `Attendance — ${capitalize(a.status)}`,
          sublabel: a.notes || "",
          status: a.status,
          date: a.date,
        });
      });

      // Sort by date descending
      activity.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRecentActivity(activity.slice(0, 5));
    } catch (e) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
    checkSyncCount();
  }, [loadDashboard, checkSyncCount]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
    checkSyncCount();
  };

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const statusColors: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-700",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    reimbursed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-600",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };

  const activityIcons: Record<string, MCIName> = {
    expense: "receipt",
    attendance: "map-marker",
    task: "check-circle",
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#0368FE" />
        <Text className="text-text-secondary mt-3 text-sm font-medium">
          Loading your dashboard…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View className="px-6 pb-6 bg-primary dark:bg-primary-dark" style={{ paddingTop: topInset }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-0.5">
              {getGreeting()}
            </Text>
            <Text className="text-white text-2xl font-black leading-tight" numberOfLines={1}>
              {user?.first_name ?? "Agent"}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View className="bg-white/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold uppercase tracking-wide">
                  {userRole === "staff"
                    ? "Cashier / Biller"
                    : userRole === "manager"
                    ? "Store Manager"
                    : userRole === "warehouse_manager"
                    ? "Warehouse Manager"
                    : "Field Agent"}
                </Text>
              </View>
              {activeCompany?.name && (
                <Text className="text-white/70 text-xs font-medium" numberOfLines={1}>
                  · {activeCompany.name}
                </Text>
              )}
            </View>
          </View>
          {/* Avatar */}
          <View className="w-12 h-12 rounded-full bg-white/20 justify-center items-center border-2 border-white/30">
            <Text className="text-white font-black text-lg">
              {getInitials(user?.first_name || user?.firstName, user?.last_name || user?.lastName)}
            </Text>
          </View>
        </View>

        {/* Check-in status banner */}
        <View
          className={`mt-4 flex-row items-center px-4 py-2.5 rounded-2xl ${
            stats.isCheckedInToday
              ? "bg-white/15"
              : "bg-amber-400/20 border border-amber-400/30"
          }`}
        >
          <MaterialCommunityIcons
            name={stats.isCheckedInToday ? "check-circle" : "alert-circle"}
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-bold text-sm flex-1">
            {stats.isCheckedInToday
              ? (t("staff")?.includes("कामगार") ? "आज की हाजिरी लग गई है" : "Attendance marked for today")
              : (t("staff")?.includes("कामगार") ? "आज आपकी हाजिरी नहीं लगी है" : "You haven't checked in today yet")}
          </Text>
          {!stats.isCheckedInToday && (
            <Pressable
              onPress={() => router.push("/attendance")}
              className="bg-white/25 px-4 py-2.5 rounded-xl active:opacity-80"
            >
              <Text className="text-white text-sm font-bold">
                {t("staff")?.includes("कामगार") ? "चेक इन करें" : "Check In"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-6 pt-6 pb-10">
        {/* ── Offline Sync Banner ── */}
        {pendingSyncCount > 0 && (
          <View className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3" style={{ gap: 8 }}>
              <MaterialCommunityIcons name="cloud-sync" size={20} color="#B45309" />
              <View className="flex-1">
                <Text className="text-amber-800 dark:text-amber-400 font-bold text-sm">
                  {t("staff")?.includes("कामगार") ? "ऑफ़लाइन डेटा सिंक करना बाकी है" : "Offline Data Pending"}
                </Text>
                <Text className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
                  {pendingSyncCount} {t("staff")?.includes("कामगार") ? "रिकॉर्ड सिंक होना बाकी है" : "records waiting to sync"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={async () => {
                if (syncing) return;
                setSyncing(true);
                await syncQueuedData();
                await checkSyncCount();
                await loadDashboard();
                setSyncing(false);
              }}
              disabled={syncing}
              className="bg-amber-600 px-4 py-2.5 rounded-xl active:opacity-90 flex-row items-center"
              style={{ gap: 4 }}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="sync" size={14} color="#FFFFFF" />
                  <Text className="text-white text-xs font-bold uppercase">Sync</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* ── Stats Row ── */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark">
              {stats.pendingTasksCount}
            </Text>
            <Text className="text-xs font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              {t("staff")?.includes("कामगार") ? "लंबित कार्य" : "Pending Tasks"}
            </Text>
          </View>
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark">
              {stats.pendingExpensesCount}
            </Text>
            <Text className="text-xs font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              {t("expenses")?.includes("खर्चे") ? "लंबित खर्चे" : "Expenses Pending"}
            </Text>
          </View>
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-lg font-black text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
              ₹{stats.thisMonthExpenseTotal >= 1000
                ? `${(stats.thisMonthExpenseTotal / 1000).toFixed(1)}k`
                : stats.thisMonthExpenseTotal.toFixed(0)}
            </Text>
            <Text className="text-xs font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              {t("staff")?.includes("कामगार") ? "इस महीने" : "This Month"}
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "त्वरित विकल्प" : "Quick Actions"}
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => router.push(action.route)}
              className="bg-surface dark:bg-surface-dark border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 items-center shadow-sm active:opacity-80"
              style={{ width: "30%" }}
            >
              <MaterialCommunityIcons name={action.icon} size={36} color="#0368FE" style={{ marginBottom: 8 }} />
              <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark text-center">
                {action.id === "attendance" && (t("staff")?.includes("कामगार") ? "हाजिरी (Check In)" : "Check In")}
                {action.id === "expenses" && (t("expenses")?.includes("खर्चे") ? "खर्च दर्ज करें" : "Log Expense")}
                {action.id === "tasks" && (t("staff")?.includes("कामगार") ? "मेरे कार्य (Tasks)" : "My Tasks")}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── My Performance ── */}
        {performance.completed > 0 && (
          <>
            <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
              {t("staff")?.includes("कामगार") ? "मेरा प्रदर्शन (This Month)" : "My Performance This Month"}
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text-primary font-bold text-base">Tasks Completed</Text>
                <Text className="text-primary font-black text-xl">{performance.completed}</Text>
              </View>
              {Object.keys(performance.outcomes).length > 0 && (
                <View className="gap-2">
                  {Object.entries(performance.outcomes).map(([outcome, count]) => (
                    <View key={outcome} className="flex-row items-center justify-between">
                      <Text className="text-sm text-text-secondary capitalize">{outcome.replace(/_/g, " ")}</Text>
                      <View className="bg-primary/10 px-3 py-1 rounded-lg">
                        <Text className="text-sm font-bold text-primary">{count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Recent Activity ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          {t("staff")?.includes("कामगार") ? "हालिया गतिविधि" : "Recent Activity"}
        </Text>

        {recentActivity.length === 0 ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 items-center">
            <MaterialCommunityIcons name="clipboard-text-outline" size={30} color="#9E9E9E" style={{ marginBottom: 8 }} />
            <Text className="text-text-secondary font-semibold text-base text-center">
              {t("staff")?.includes("कामगार")
                ? "कोई हालिया गतिविधि नहीं है।\nशुरुआत करने के लिए चेक-इन करें।"
                : "No recent activity yet.\nStart by checking in or logging an expense."}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {recentActivity.map((item) => (
              <View
                key={item.id}
                className="bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 flex-row items-start shadow-sm"
              >
                <View className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 justify-center items-center mr-3 mt-0.5">
                  <MaterialCommunityIcons name={activityIcons[item.type]} size={18} color="#6B7280" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                    {item.type === "expense" && (t("expenses")?.includes("खर्चे") ? "खर्च दर्ज" : item.label)}
                    {item.type === "attendance" && (t("staff")?.includes("कामगार") ? "हाजिरी (Attendance)" : item.label)}
                    {item.type === "task" && (t("staff")?.includes("कामगार") ? "कार्य (Task)" : item.label)}
                  </Text>
                  <Text className="text-sm text-text-secondary mt-0.5" numberOfLines={1}>
                    {item.sublabel || item.date}
                  </Text>
                </View>
                <View className="items-end">
                  {item.amount !== undefined && (
                    <Text className="text-base font-black text-text-primary dark:text-text-primary-dark">
                      ₹{item.amount.toFixed(0)}
                    </Text>
                  )}
                  {item.status && (
                    <View
                      className={`px-2.5 py-1 rounded-lg mt-1 ${
                        statusColors[item.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Text className="text-sm font-bold uppercase tracking-wider">
                        {(() => {
                          if (!t("staff")?.includes("कामगार")) return item.status;
                          const hiMap: Record<string, string> = {
                            submitted: "दर्ज",
                            pending: "लंबित",
                            approved: "स्वीकृत",
                            reimbursed: "भुगतान हुआ",
                            rejected: "खारिज",
                            present: "उपस्थित",
                            absent: "अनुपस्थित",
                            in_progress: "जारी",
                            done: "पूर्ण",
                          };
                          return hiMap[item.status] ?? item.status;
                        })()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer spacer */}
        <View className="h-6" />
      </View>
    </ScrollView>
  );
}
