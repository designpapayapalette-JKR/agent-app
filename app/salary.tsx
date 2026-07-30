import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { api } from "../src/lib/api";
import { useTopInset } from "../src/lib/useTopInset";

interface SalaryRecord {
  id: string;
  date: string;
  amount: string;
  status: string;
  reference?: string;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  paid: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-600 dark:text-green-400" },
  pending: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400" },
};

export default function SalaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // The backend already scopes GET /salaries to the logged-in user for
  // field_agent/staff roles — no client-side filtering needed here.
  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: SalaryRecord[] }>("/salaries");
      setRecords(res.data ?? []);
    } catch (e) {
      console.error("Failed to load salary records:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = records
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  return (
    <View className="flex-1 bg-background">
      <View
        className="bg-surface border-b border-outline-variant flex-row items-center px-6 pb-3"
        style={{ gap: 12, paddingTop: topInset }}
      >
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        <Text className="text-xl font-bold text-on-surface">My Salary</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <View className="bg-primary rounded-3xl p-6 mb-4 items-center">
              <Text className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Paid</Text>
              <Text className="text-white text-3xl font-black mt-1">₹{totalPaid.toFixed(2)}</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <MaterialCommunityIcons name="cash-remove" size={40} color={theme.colors.outline} style={{ marginBottom: 12 }} />
              <Text className="text-on-surface-variant font-semibold text-sm text-center">
                No salary records yet. Your employer will add these as they’re paid.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = STATUS_COLOR[item.status] ?? STATUS_COLOR.pending;
            return (
              <View className="bg-surface p-4 rounded-2xl border border-outline-variant flex-row justify-between items-center">
                <View className="flex-1 mr-2">
                  <Text className="font-bold text-base text-on-surface">
                    {new Date(item.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </Text>
                  {item.reference && (
                    <Text className="text-sm text-on-surface-variant mt-0.5">{item.reference}</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-base font-black text-on-surface">
                    ₹{parseFloat(item.amount).toFixed(2)}
                  </Text>
                  <View className={`px-2.5 py-1 rounded-lg mt-1 ${meta.bg}`}>
                    <Text className={`text-sm font-bold uppercase ${meta.text}`}>{item.status}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
