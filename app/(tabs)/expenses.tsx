import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth-context";
import { api, ApiError } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";
import { useBottomInset } from "../../src/lib/useBottomInset";

interface ExpenseRecord {
  id: string;
  amount: string;
  category: string;
  date: string;
  notes: string;
  status: "submitted" | "approved" | "rejected" | "reimbursed";
  attachment?: string;
}

export default function ExpensesScreen() {
  const { user } = useAuth();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  // Lists
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [category, setCategory] = useState("travel");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [mockFileId, setMockFileId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: ExpenseRecord[] }>("/expenses");
      setExpenses(res.data ?? []);
    } catch (e) {
      console.error("Failed to fetch expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const closeExpenseModal = () => {
    const hasChanges = amount.trim() !== "" || notes.trim() !== "" || attachedFileName !== "";
    if (hasChanges) {
      Alert.alert("Discard changes?", "You have unsaved changes. Are you sure you want to go back?", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => setIsModalOpen(false) },
      ]);
      return;
    }
    setIsModalOpen(false);
  };

  const handleSimulateAttachment = async () => {
    setAttachedFileName("receipt_slip.jpg (Uploading...)");
    // Simulate uploading a mock file to Directus
    try {
      // In a real device, we'd use expo-image-picker and formData
      // Here we create a mock file record or simulate upload return
      const mockId = "0f443818-ba2e-4361-9c60-c3d38708c3b2"; // Placeholder file ID
      setMockFileId(mockId);
      setAttachedFileName("receipt_slip.jpg (Attached)");
      Alert.alert("Slip Uploaded", "Mock receipt slip uploaded to storage bucket.");
    } catch (err) {
      setAttachedFileName("");
    }
  };

  const handleLogExpense = async () => {
    if (!amount || !category) {
      Alert.alert("Required Fields", "Category and Amount are required.");
      return;
    }
    if (!user?.company_id || !user?.id) return;

    setSubmitting(true);
    try {
      await api.post("/expenses", {
        amount: parseFloat(amount),
        category: category,
        date: new Date().toISOString(),
        notes: notes,
        attachment: mockFileId ?? undefined,
      });
      Alert.alert("Success", "Expense logged successfully and pending manager review.");
      setIsModalOpen(false);

      // Reset
      setAmount("");
      setNotes("");
      setCategory("travel");
      setAttachedFileName("");
      setMockFileId(null);

      fetchExpenses();
    } catch (e) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark px-6" style={{ paddingTop: topInset }}>
      {/* Title */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            Expense Claims
          </Text>
          <Text className="text-sm text-text-secondary mt-0.5 font-medium">
            Log mileage, fuel, food, and accommodation claims
          </Text>
        </View>
        <Pressable
          onPress={() => setIsModalOpen(true)}
          className="bg-primary dark:bg-primary-dark px-5 py-3.5 rounded-xl active:opacity-90 shadow-sm"
        >
          <Text className="text-white font-bold text-base">+ Claim</Text>
        </Pressable>
      </View>

      {/* List of Claims */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F7A5F" />
        </View>
      ) : expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center py-20">
          <Text className="text-text-secondary font-bold text-base text-center">No expense claims logged</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            let statusColor = "bg-gray-100 text-gray-700";
            if (item.status === "approved" || item.status === "reimbursed") statusColor = "bg-green-50 text-green-600 dark:bg-green-950/20";
            else if (item.status === "rejected") statusColor = "bg-red-50 text-red-600 dark:bg-red-950/20";

            return (
              <View className="bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 mb-3.5 shadow-sm">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-base text-text-primary dark:text-text-primary-dark capitalize">
                      {item.category} Claim
                    </Text>
                    <Text className="text-sm text-text-secondary mt-1">
                      Date: {item.date} | Note: {item.notes || "None"}
                    </Text>
                    {item.attachment && (
                      <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                        <MaterialCommunityIcons name="paperclip" size={14} color="#0F7A5F" />
                        <Text className="text-sm text-primary font-bold">
                          receipt_slip.jpg
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-black text-text-primary dark:text-text-primary-dark">
                      ₹{parseFloat(item.amount).toFixed(2)}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-lg mt-1.5 ${statusColor}`}>
                      <Text className="text-sm font-bold uppercase tracking-wider">
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Log Claim Modal */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={closeExpenseModal}>
        <ScrollView className="flex-1 bg-background dark:bg-background-dark px-6 pb-10" style={{ paddingTop: topInset }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
              Log Expense Claim
            </Text>
            <Pressable onPress={closeExpenseModal} className="w-11 h-11 items-center justify-center">
              <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <View className="space-y-4">
            {/* Category Select */}
            <View>
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Category *
              </Text>
              <ScrollView horizontal className="flex-row">
                {["travel", "fuel", "food", "other"].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`mr-2 px-4 py-3 rounded-xl border ${
                      category === cat
                        ? "bg-primary border-primary dark:bg-primary-dark"
                        : "bg-surface border-gray-200 dark:border-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold capitalize ${
                        category === cat ? "text-white" : "text-text-primary dark:text-text-primary-dark"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Amount */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Amount (INR) *
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                className="bg-surface dark:bg-zinc-900 text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-lg font-bold"
              />
            </View>

            {/* Notes */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Notes / Explanation
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Fuel refilling, lunch invoice, client visit"
                className="bg-surface dark:bg-zinc-900 text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base font-medium"
              />
            </View>

            {/* Slip upload simulation */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Receipt Slip Upload
              </Text>
              <Pressable
                onPress={handleSimulateAttachment}
                className="border-2 border-dashed border-gray-300 dark:border-zinc-800 p-6 rounded-2xl items-center bg-surface dark:bg-zinc-900 active:opacity-90"
              >
                <Text className="text-base font-bold text-primary mb-1">
                  {attachedFileName ? "Change Slip" : "+ Capture / Attach Receipt"}
                </Text>
                <Text className="text-sm text-text-secondary mt-0.5">
                  {attachedFileName || "Accepts JPG or PNG image files"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row justify-between mt-10" style={{ marginBottom: bottomInset }}>
            <Pressable
              onPress={closeExpenseModal}
              className="border border-gray-200 dark:border-zinc-800 py-4 px-6 rounded-xl w-[48%] items-center"
            >
              <Text className="text-text-secondary dark:text-text-secondary-dark font-bold text-base">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleLogExpense}
              disabled={submitting}
              className="bg-primary dark:bg-primary-dark py-4 px-6 rounded-xl w-[48%] items-center"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Submit Claim</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
