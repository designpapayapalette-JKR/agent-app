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

const QUICK_ACTIONS: { id: string; label: string; icon: MCIName; route: "/attendance" | "/expenses" | "/tasks" | "/walkie-talkie" }[] = [
  { id: "attendance", label: "Check In", icon: "map-marker", route: "/attendance" },
  { id: "expenses", label: "Log Expense", icon: "receipt", route: "/expenses" },
  { id: "tasks", label: "My Tasks", icon: "check-circle", route: "/tasks" },
  { id: "walkie-talkie", label: "Voice", icon: "radio-handheld", route: "/walkie-talkie" },
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
  const { user, activeCompany } = useAuth();
  const router = useRouter();
  const topInset = useTopInset();

  const [stats, setStats] = useState<DashboardStats>({
    isCheckedInToday: false,
    pendingTasksCount: 0,
    pendingExpensesCount: 0,
    thisMonthExpenseTotal: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

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
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
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
        <ActivityIndicator size="large" color="#0F7A5F" />
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
            {activeCompany?.name && (
              <Text className="text-white/70 text-sm font-medium mt-0.5" numberOfLines={1}>
                {activeCompany.name}
              </Text>
            )}
          </View>
          {/* Avatar */}
          <View className="w-12 h-12 rounded-full bg-white/20 justify-center items-center border-2 border-white/30">
            <Text className="text-white font-black text-lg">
              {getInitials(user?.first_name, user?.last_name)}
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
              ? "Attendance marked for today"
              : "You haven't checked in today yet"}
          </Text>
          {!stats.isCheckedInToday && (
            <Pressable
              onPress={() => router.push("/attendance")}
              className="bg-white/25 px-4 py-2.5 rounded-xl active:opacity-80"
            >
              <Text className="text-white text-sm font-bold">Check In</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-6 pt-6 pb-10">
        {/* ── Stats Row ── */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark">
              {stats.pendingTasksCount}
            </Text>
            <Text className="text-sm font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              Pending Tasks
            </Text>
          </View>
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark">
              {stats.pendingExpensesCount}
            </Text>
            <Text className="text-sm font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              Expenses Pending
            </Text>
          </View>
          <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm items-center">
            <Text className="text-lg font-black text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
              ₹{stats.thisMonthExpenseTotal >= 1000
                ? `${(stats.thisMonthExpenseTotal / 1000).toFixed(1)}k`
                : stats.thisMonthExpenseTotal.toFixed(0)}
            </Text>
            <Text className="text-sm font-semibold text-text-secondary mt-0.5 text-center uppercase tracking-wide">
              This Month
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => router.push(action.route)}
              className="bg-surface dark:bg-surface-dark border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 items-center shadow-sm active:opacity-80"
              style={{ width: "47%" }}
            >
              <MaterialCommunityIcons name={action.icon} size={36} color="#0F7A5F" style={{ marginBottom: 8 }} />
              <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark text-center">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Recent Activity ── */}
        <Text className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
          Recent Activity
        </Text>

        {recentActivity.length === 0 ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 items-center">
            <MaterialCommunityIcons name="clipboard-text-outline" size={30} color="#9E9E9E" style={{ marginBottom: 8 }} />
            <Text className="text-text-secondary font-semibold text-base text-center">
              No recent activity yet.{"\n"}Start by checking in or logging an expense.
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
                    {item.label}
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
                        {item.status}
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
