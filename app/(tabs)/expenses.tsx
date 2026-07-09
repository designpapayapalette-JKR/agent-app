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
import * as ImagePicker from "expo-image-picker";
import { api, ApiError, uploadDocument } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";
import { useBottomInset } from "../../src/lib/useBottomInset";
import { useTerminology } from "../../src/lib/terminology-context";
import { queueExpense } from "../../src/lib/offlineQueue";

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
  const { t } = useTerminology();
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
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

  const resetExpenseForm = () => {
    setAmount("");
    setNotes("");
    setCategory("travel");
    setAttachedFileName("");
    setAttachmentUrl(null);
  };

  const closeExpenseModal = () => {
    const hasChanges = amount.trim() !== "" || notes.trim() !== "" || attachedFileName !== "";
    if (hasChanges) {
      Alert.alert("Discard changes?", "You have unsaved changes. Are you sure you want to go back?", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => { resetExpenseForm(); setIsModalOpen(false); } },
      ]);
      return;
    }
    setIsModalOpen(false);
  };

  const handleAttachReceipt = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Camera access is required to photograph a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAttachment(true);
    setAttachedFileName("receipt_slip.jpg (Uploading...)");
    try {
      const url = await uploadDocument(result.assets[0].uri, "expense");
      setAttachmentUrl(url);
      setAttachedFileName("receipt_slip.jpg (Attached)");
    } catch (err) {
      setAttachedFileName("");
      Alert.alert("Upload Failed", err instanceof ApiError ? err.message : "Could not upload the receipt.");
    } finally {
      setUploadingAttachment(false);
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
        attachment: attachmentUrl ?? undefined,
      });
      Alert.alert(t("expenses")?.includes("खर्चे") ? "सफलता" : "Success", t("expenses")?.includes("खर्चे") ? "खर्च सफलतापूर्वक दर्ज कर दिया गया है!" : "Expense logged successfully and pending manager review.");
      setIsModalOpen(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (e: any) {
      if (e?.message?.includes("Network request failed") || !e?.status) {
        await queueExpense({
          category,
          amount: parseFloat(amount),
          notes,
          dateStr: new Date().toISOString(),
        });
        Alert.alert(
          t("expenses")?.includes("खर्चे") ? "ऑफ़लाइन मोड" : "Offline Mode",
          t("expenses")?.includes("खर्चे")
            ? "नेटवर्क कनेक्शन नहीं है। आपका खर्च ऑफ़लाइन सहेज लिया गया है और इंटरनेट वापस आने पर सिंक हो जाएगा!"
            : "Network request failed. Your expense has been saved offline and will sync automatically when your connection returns!"
        );
        setIsModalOpen(false);
        resetExpenseForm();
        setExpenses((prev) => [
          {
            id: "offline-expense-" + Date.now(),
            amount: amount,
            category,
            date: new Date().toISOString(),
            notes: notes + " (Offline Cached)",
            status: "submitted",
          },
          ...prev,
        ]);
      } else {
        Alert.alert("Error", e instanceof ApiError ? e.message : "Failed to log expense.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark px-6" style={{ paddingTop: topInset }}>
      {/* Title */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {t("expenses")}
          </Text>
          <Text className="text-sm text-text-secondary mt-0.5 font-medium">
            {t("expenses")?.includes("खर्चे")
              ? "ईंधन, यात्रा, भोजन और आवास दावों का रिकॉर्ड"
              : "Log mileage, fuel, food, and accommodation claims"}
          </Text>
        </View>
        <Pressable
          onPress={() => setIsModalOpen(true)}
          className="bg-primary dark:bg-primary-dark px-5 py-3.5 rounded-xl active:opacity-90 shadow-sm"
        >
          <Text className="text-white font-bold text-base">
            {t("expenses")?.includes("खर्चे") ? "+ खर्च" : "+ Claim"}
          </Text>
        </Pressable>
      </View>

      {/* List of Claims */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F7A5F" />
        </View>
      ) : expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center py-20">
          <Text className="text-text-secondary font-bold text-base text-center">
            {t("expenses")?.includes("खर्चे") ? "कोई दावा दर्ज नहीं किया गया है" : "No expense claims logged"}
          </Text>
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
                      {(() => {
                        if (!t("expenses")?.includes("खर्चे")) return item.category + " Claim";
                        const catHi: Record<string, string> = {
                          travel: "यात्रा खर्च",
                          fuel: "ईंधन खर्च",
                          food: "भोजन खर्च",
                          other: "अन्य खर्च",
                        };
                        return catHi[item.category] ?? item.category + " खर्च";
                      })()}
                    </Text>
                    <Text className="text-sm text-text-secondary mt-1">
                      {t("expenses")?.includes("खर्चे") ? "तारीख" : "Date"}: {item.date} | {t("expenses")?.includes("खर्चे") ? "विवरण" : "Note"}: {item.notes || "—"}
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
                      <Text className="text-xs font-bold uppercase tracking-wider">
                        {(() => {
                          if (!t("expenses")?.includes("खर्चे")) return item.status;
                          const statHi: Record<string, string> = {
                            submitted: "दर्ज",
                            approved: "स्वीकृत",
                            rejected: "खारिज",
                            reimbursed: "भुगतान हुआ",
                          };
                          return statHi[item.status] ?? item.status;
                        })()}
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
        <ScrollView className="flex-1 bg-background dark:bg-background-dark px-6 pb-10" keyboardShouldPersistTaps="handled" style={{ paddingTop: topInset }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
              {t("expenses")?.includes("खर्चे") ? "नया खर्च दर्ज करें" : "Log Expense Claim"}
            </Text>
            <Pressable onPress={closeExpenseModal} className="w-11 h-11 items-center justify-center">
              <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <View className="space-y-4">
            {/* Category Select */}
            <View>
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {t("expenses")?.includes("खर्चे") ? "श्रेणी (Category) *" : "Category *"}
              </Text>
              <ScrollView horizontal className="flex-row" showsHorizontalScrollIndicator={false}>
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
                      {(() => {
                        if (!t("expenses")?.includes("खर्चे")) return cat;
                        const catHi: Record<string, string> = {
                          travel: "यात्रा",
                          fuel: "ईंधन",
                          food: "भोजन",
                          other: "अन्य",
                        };
                        return catHi[cat] ?? cat;
                      })()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Amount */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {t("expenses")?.includes("खर्चे") ? "कुल राशि (Amount) *" : "Amount (INR) *"}
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
                {t("expenses")?.includes("खर्चे") ? "खर्च का विवरण (Notes)" : "Notes / Explanation"}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t("expenses")?.includes("खर्चे") ? "ईंधन भरवाया, दोपहर का भोजन, आदि" : "Fuel refilling, lunch invoice, client visit"}
                className="bg-surface dark:bg-zinc-900 text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base font-medium"
              />
            </View>

            {/* Slip upload simulation */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {t("expenses")?.includes("खर्चे") ? "रसीद अपलोड (Receipt Scan)" : "Receipt Slip Upload"}
              </Text>
              <Pressable
                onPress={handleAttachReceipt}
                disabled={uploadingAttachment}
                className="border-2 border-dashed border-gray-300 dark:border-zinc-800 p-6 rounded-2xl items-center bg-surface dark:bg-zinc-900 active:opacity-90"
              >
                <Text className="text-base font-bold text-primary mb-1">
                  {attachedFileName
                    ? (t("expenses")?.includes("खर्चे") ? "रसीद बदलें" : "Change Slip")
                    : (t("expenses")?.includes("खर्चे") ? "+ रसीद फोटो लें" : "+ Capture Receipt")}
                </Text>
                <Text className="text-sm text-text-secondary mt-0.5">
                  {attachedFileName || (t("expenses")?.includes("खर्चे") ? "रसीद/बिल की फोटो खींचें" : "Take a photo of the receipt")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row justify-between mt-10" style={{ marginBottom: bottomInset + 20 }}>
            <Pressable
              onPress={closeExpenseModal}
              className="border border-gray-200 dark:border-zinc-800 py-4 px-6 rounded-xl w-[48%] items-center"
            >
              <Text className="text-text-secondary dark:text-text-secondary-dark font-bold text-base">
                {t("expenses")?.includes("खर्चे") ? "रद्द करें" : "Cancel"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleLogExpense}
              disabled={submitting}
              className="bg-primary dark:bg-primary-dark py-4 px-6 rounded-xl w-[48%] items-center"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {t("expenses")?.includes("खर्चे") ? "दावा भेजें" : "Submit Claim"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
