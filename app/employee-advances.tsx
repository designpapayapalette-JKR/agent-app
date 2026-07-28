import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, RefreshControl, Text, Pressable, Alert, Modal, TextInput } from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../src/lib/api";
import { useAuth } from "../src/lib/auth-context";
import { useTopInset, useBottomInset } from "../src/lib/useTopInset";
import EmptyState from "../src/components/EmptyState";

type AdvanceRecord = {
  id: string;
  userId: string;
  amount: number;
  date: string;
  reason: string | null;
  status: string;
  repaymentDate: string | null;
  repaymentAmount: number | null;
  notes: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string | null; role: string };
};

type SummaryData = {
  pending: { count: number; total: number };
  approved: { count: number; total: number };
  repaid: { count: number; total: number; recovered: number };
  adjusted: { count: number; total: number; recovered: number };
  totalOutstanding: number;
};

const inr = (n: number) => `\u20B9${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#D97706" },
  approved: { label: "Approved", color: "#3B82F6" },
  repaid: { label: "Repaid", color: "#10B981" },
  adjusted: { label: "Adjusted", color: "#6B7280" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmployeeAdvancesScreen() {
  const { userRole, user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formModal, setFormModal] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [advRes, sumRes] = await Promise.all([
        api.get("/employee-advances"),
        api.get("/employee-advances/summary"),
      ]);
      const adv = advRes as { data: AdvanceRecord[] } | undefined;
      const sum = sumRes as { data: SummaryData } | undefined;
      if (adv?.data) setAdvances(adv.data);
      if (sum?.data) setSummary(sum.data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCreate = async () => {
    if (!formAmount || Number(formAmount) <= 0) {
      Alert.alert("Validation Error", "Amount is required.");
      return;
    }
    setFormLoading(true);
    try {
      await api.post("/employee-advances", {
        userId: user?.id,
        amount: Number(formAmount),
        date: formDate,
        reason: formReason.trim() || undefined,
      });
      setFormModal(false);
      setFormAmount("");
      setFormDate(new Date().toISOString().slice(0, 10));
      setFormReason("");
      load();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error?.message || err?.response?.data?.error || "Failed to submit request");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Request", "Delete this pending advance request?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api.delete(`/employee-advances/${id}`); load(); }
        catch { Alert.alert("Error", "Failed to delete"); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurface} /></Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.onSurface }}>My Advances</Text>
        </View>
        <Pressable onPress={() => { setFormAmount(""); setFormDate(new Date().toISOString().slice(0, 10)); setFormReason(""); setFormModal(true); }} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Request</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {summary && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 100, backgroundColor: theme.colors.surfaceVariant, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>Pending</Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#D97706", marginTop: 2 }}>{inr(summary.pending.total)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100, backgroundColor: theme.colors.surfaceVariant, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>Approved</Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#3B82F6", marginTop: 2 }}>{inr(summary.approved.total)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100, backgroundColor: theme.colors.surfaceVariant, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>Outstanding</Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#EF4444", marginTop: 2 }}>{inr(summary.totalOutstanding)}</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
        ) : advances.length === 0 ? (
          <EmptyState icon="currency-inr" title="No advances" description="Request your first salary advance to get started." />
        ) : (
          <View style={{ paddingHorizontal: 12, gap: 8 }}>
            {advances.map((a) => {
              const sm = STATUS_META[a.status] || { label: a.status, color: "#6B7280" };
              return (
                <View key={a.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.outlineVariant }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ backgroundColor: sm.color + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: sm.color }}>{sm.label}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{formatDate(a.date)}</Text>
                      </View>
                      {a.reason ? <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{a.reason}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.onSurface }}>{inr(a.amount)}</Text>
                  </View>
                  {a.repaymentAmount != null && (
                    <Text style={{ fontSize: 11, color: "#10B981", marginTop: 4 }}>Repaid: {inr(a.repaymentAmount)}</Text>
                  )}
                  {a.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant, paddingTop: 10 }}>
                      <Pressable onPress={() => handleDelete(a.id)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EF444420", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                        <MaterialCommunityIcons name="delete-outline" size={14} color="#EF4444" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>Cancel Request</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* New request modal */}
      <Modal visible={formModal} transparent animationType="slide" onRequestClose={() => setFormModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: bottomInset + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.onSurface }}>Request Advance</Text>
              <Pressable onPress={() => setFormModal(false)}><MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurfaceVariant} /></Pressable>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Amount (₹)</Text>
            <TextInput style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: "600", color: theme.colors.onSurface, marginBottom: 12 }} keyboardType="number-pad" placeholder="e.g. 5000" placeholderTextColor={theme.colors.onSurfaceVariant} value={formAmount} onChangeText={setFormAmount} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Date</Text>
            <TextInput style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 10, padding: 12, fontSize: 15, color: theme.colors.onSurface, marginBottom: 12 }} value={formDate} onChangeText={setFormDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.onSurfaceVariant} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Reason</Text>
            <TextInput style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 10, padding: 12, fontSize: 15, color: theme.colors.onSurface, marginBottom: 16 }} placeholder="e.g. Travel, medical..." placeholderTextColor={theme.colors.onSurfaceVariant} value={formReason} onChangeText={setFormReason} />
            <Pressable onPress={handleCreate} disabled={formLoading} style={{ backgroundColor: theme.colors.primary, borderRadius: 12, padding: 14, alignItems: "center" }}>
              {formLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Submit Request</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
