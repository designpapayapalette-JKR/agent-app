import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image, Alert, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File, Directory, Paths } from "expo-file-system";
import { useAuth } from "../../src/lib/auth-context";
import { useTopInset } from "../../src/lib/useTopInset";

interface StoredDocument {
  filename: string;
  uri: string;
  label: string;
}

// Stored locally on-device only (no backend) — this is the employee's own
// quick-access wallet for ID cards/documents, not a company-visible HR
// record. Filenames are prefixed with a label so they survive app restarts
// without needing a separate index file.
const DOCS_DIR_NAME = "employee-documents";

function labelFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  const withoutTimestamp = withoutExt.replace(/-\d+$/, "");
  return withoutTimestamp.replace(/-/g, " ");
}

export default function DocumentsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const topInset = useTopInset();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUri, setViewingUri] = useState<string | null>(null);

  const docsDir = new Directory(Paths.document, DOCS_DIR_NAME);

  const load = useCallback(() => {
    try {
      if (!docsDir.exists) {
        docsDir.create();
      }
      const files = docsDir.list().filter((entry): entry is File => entry instanceof File);
      setDocuments(
        files.map((f) => ({
          filename: f.name,
          uri: f.uri,
          label: labelFromFilename(f.name),
        }))
      );
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddDocument = async (labelHint: string) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Camera access is required to photograph a document.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      if (!docsDir.exists) docsDir.create();
      const safeLabel = labelHint.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const dest = new File(docsDir, `${safeLabel}-${Date.now()}.jpg`);
      const src = new File(result.assets[0].uri);
      await src.copy(dest);
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save the document.");
    }
  };

  const handleDelete = (doc: StoredDocument) => {
    Alert.alert("Delete this document?", `"${doc.label}" will be removed from this device.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            new File(doc.uri).delete();
            load();
          } catch (e) {
            Alert.alert("Error", "Could not delete the document.");
          }
        },
      },
    ]);
  };

  const QUICK_LABELS = ["Aadhar Card", "PAN Card", "Driving License", "Photo ID"];

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="bg-surface dark:bg-surface-dark border-b border-gray-100 dark:border-zinc-800 flex-row items-center px-6 pb-3"
        style={{ gap: 12, paddingTop: topInset }}
      >
        <Pressable onPress={() => router.back()} className="w-touch-target h-touch-target items-center justify-center -ml-2">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F7A5F" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">My Documents</Text>
      </View>

      <Text className="text-sm text-text-secondary px-6 mt-4">
        Stored only on this device for your own quick access — not visible to your employer.
      </Text>

      <View className="flex-row flex-wrap px-6 mt-4" style={{ gap: 8 }}>
        {QUICK_LABELS.map((label) => (
          <Pressable
            key={label}
            onPress={() => handleAddDocument(label)}
            className="px-4 py-2.5 rounded-xl border border-dashed border-primary flex-row items-center"
            style={{ gap: 6 }}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={16} color="#0F7A5F" />
            <Text className="text-sm font-bold text-primary">{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F7A5F" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.filename}
          numColumns={2}
          contentContainerStyle={{ padding: 24, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <MaterialCommunityIcons name="card-account-details-outline" size={40} color="#9E9E9E" style={{ marginBottom: 12 }} />
              <Text className="text-text-secondary font-semibold text-sm text-center">
                No documents saved yet. Tap a quick option above to photograph one.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setViewingUri(item.uri)}
              onLongPress={() => handleDelete(item)}
              className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden"
            >
              <Image source={{ uri: item.uri }} style={{ width: "100%", height: 120 }} resizeMode="cover" />
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark px-3 py-2 capitalize" numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={viewingUri !== null} animationType="fade" transparent onRequestClose={() => setViewingUri(null)}>
        <Pressable className="flex-1 bg-black/90 items-center justify-center" onPress={() => setViewingUri(null)}>
          {viewingUri && <Image source={{ uri: viewingUri }} style={{ width: "90%", height: "70%" }} resizeMode="contain" />}
          <Text className="text-white text-sm font-bold mt-6">Tap anywhere to close · Long-press a card to delete</Text>
        </Pressable>
      </Modal>
    </View>
  );
}
