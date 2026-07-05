import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useAuth } from "../../src/lib/auth-context";
import { api, ApiError } from "../../src/lib/api";
import { useTopInset } from "../../src/lib/useTopInset";

type MCIName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";

interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string;
  party_name?: string;
  challan_id?: string;
  notes?: string;
  date_created?: string;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const STATUS_META: Record<
  TaskStatus,
  { label: string; bg: string; text: string; icon: MCIName }
> = {
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", icon: "clock-outline" },
  in_progress: { label: "In Progress", bg: "bg-blue-100", text: "text-blue-700", icon: "sync" },
  done: { label: "Done", bg: "bg-green-100", text: "text-green-700", icon: "check-circle" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", icon: "close-circle" },
};

const ICON_COLOR_BY_STATUS: Record<TaskStatus, string> = {
  pending: "#B45309",
  in_progress: "#1D4ED8",
  done: "#15803D",
  cancelled: "#6B7280",
};

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  pending: "in_progress",
  in_progress: "done",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function isOverdue(dueDate?: string, status?: TaskStatus) {
  if (!dueDate || status === "done" || status === "cancelled") return false;
  return new Date(dueDate) < new Date();
}

export default function TasksScreen() {
  const { user } = useAuth();
  const topInset = useTopInset();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<{ data: AgentTask[] }>("/agent-tasks");
      setTasks(res.data ?? []);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
      // If collection doesn't exist yet, show empty rather than crash
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleAdvanceStatus = async (task: AgentTask) => {
    const next = NEXT_STATUS[task.status];
    if (!next) {
      Alert.alert(
        "Task Complete",
        "This task is already marked as done."
      );
      return;
    }

    const labels: Record<TaskStatus, string> = {
      pending: "mark as In Progress",
      in_progress: "mark as Done",
      done: "reopen",
      cancelled: "reopen",
    };

    Alert.alert(
      "Update Task",
      `Do you want to ${labels[task.status]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdating(true);
            try {
              await api.patch(`/agent-tasks/${task.id}`, { status: next });
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: next } : t
                )
              );
              if (selectedTask?.id === task.id) {
                setSelectedTask({ ...task, status: next });
              }
              Alert.alert(
                "Updated",
                next === "done"
                  ? "Task marked as complete! Great work."
                  : "Task is now In Progress."
              );
            } catch (e) {
              Alert.alert("Error", e instanceof ApiError ? e.message : "Failed to update task.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "all") return true;
    return t.status === activeFilter;
  });

  const tasksByFilter = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="px-6 pb-4" style={{ paddingTop: topInset }}>
        <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark">
          My Tasks
        </Text>
        <Text className="text-sm text-text-secondary font-medium mt-0.5">
          {tasks.length} total task{tasks.length !== 1 ? "s" : ""} assigned to you
        </Text>
      </View>

      {/* Filter tabs */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {STATUS_FILTERS.map((f) => {
              const count = tasksByFilter[f.key as keyof typeof tasksByFilter];
              const active = activeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  className={`px-4 py-3 rounded-xl flex-row items-center gap-1.5 ${
                    active
                      ? "bg-primary dark:bg-primary-dark"
                      : "bg-surface dark:bg-surface-dark border border-gray-200 dark:border-zinc-800"
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      active
                        ? "text-white"
                        : "text-text-primary dark:text-text-primary-dark"
                    }`}
                  >
                    {f.label}
                  </Text>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      active ? "bg-white/25" : "bg-gray-100 dark:bg-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-sm font-black ${
                        active ? "text-white" : "text-text-secondary"
                      }`}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Task list */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F7A5F" />
        </View>
      ) : filteredTasks.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <MaterialCommunityIcons
            name={activeFilter === "done" ? "party-popper" : "clipboard-text-outline"}
            size={36}
            color="#9E9E9E"
            style={{ marginBottom: 16 }}
          />
          <Text className="text-text-primary dark:text-text-primary-dark font-bold text-center text-base">
            {activeFilter === "all"
              ? "No tasks assigned yet"
              : `No ${activeFilter.replace("_", " ")} tasks`}
          </Text>
          <Text className="text-text-secondary text-sm text-center mt-1">
            {activeFilter === "all"
              ? "Your manager will assign tasks here."
              : "Try switching to a different filter."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.pending;
            const overdue = isOverdue(item.due_date, item.status);
            return (
              <Pressable
                onPress={() => setSelectedTask(item)}
                className="bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm active:opacity-90"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text
                      className="font-bold text-base text-text-primary dark:text-text-primary-dark"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.party_name && (
                      <View className="flex-row items-center mt-0.5" style={{ gap: 4 }}>
                        <MaterialCommunityIcons name="store" size={13} color="#6B7280" />
                        <Text className="text-sm text-text-secondary">
                          {item.party_name}
                        </Text>
                      </View>
                    )}
                    {item.description ? (
                      <Text
                        className="text-sm text-text-secondary mt-1"
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    className={`px-2.5 py-1.5 rounded-xl flex-row items-center ${meta.bg}`}
                    style={{ gap: 4 }}
                  >
                    <MaterialCommunityIcons name={meta.icon} size={13} color={ICON_COLOR_BY_STATUS[item.status]} />
                    <Text className={`text-sm font-bold ${meta.text}`}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                {/* Footer row */}
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-row items-center gap-3">
                    {item.due_date && (
                      <View className="flex-row items-center gap-1">
                        <MaterialCommunityIcons
                          name={overdue ? "alert-circle" : "calendar"}
                          size={13}
                          color={overdue ? "#EF4444" : "#6B7280"}
                        />
                        <Text
                          className={`text-sm font-semibold ${
                            overdue ? "text-red-500" : "text-text-secondary"
                          }`}
                        >
                          Due {formatDate(item.due_date)}
                          {overdue ? " (Overdue)" : ""}
                        </Text>
                      </View>
                    )}
                    {item.challan_id && (
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <MaterialCommunityIcons name="truck" size={13} color="#0F7A5F" />
                        <Text className="text-sm text-primary font-semibold">
                          Challan linked
                        </Text>
                      </View>
                    )}
                  </View>
                  {NEXT_STATUS[item.status] && (
                    <Pressable
                      onPress={() => handleAdvanceStatus(item)}
                      disabled={updating}
                      className="bg-primary dark:bg-primary-dark px-4 py-2.5 rounded-xl active:opacity-90 flex-row items-center"
                      style={{ gap: 4 }}
                    >
                      <Text className="text-white text-sm font-bold">
                        {item.status === "pending" ? "Start" : "Done"}
                      </Text>
                      <MaterialCommunityIcons
                        name={item.status === "pending" ? "arrow-right" : "check"}
                        size={14}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTask(null)}
      >
        {selectedTask && (
          <ScrollView className="flex-1 bg-background dark:bg-background-dark px-6 pt-8 pb-12">
            {/* Modal header */}
            <View className="flex-row justify-between items-start mb-6">
              <Text className="text-xl font-black text-text-primary dark:text-text-primary-dark flex-1 mr-3">
                Task Detail
              </Text>
              <Pressable
                onPress={() => setSelectedTask(null)}
                className="w-11 h-11 rounded-full bg-gray-100 dark:bg-zinc-800 justify-center items-center"
              >
                <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>

            {/* Status badge */}
            {(() => {
              const meta =
                STATUS_META[selectedTask.status] ?? STATUS_META.pending;
              return (
                <View
                  className={`self-start px-4 py-2 rounded-2xl mb-5 flex-row items-center ${meta.bg}`}
                  style={{ gap: 6 }}
                >
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={15}
                    color={ICON_COLOR_BY_STATUS[selectedTask.status]}
                  />
                  <Text className={`text-sm font-bold ${meta.text}`}>
                    {meta.label}
                  </Text>
                </View>
              );
            })()}

            {/* Title */}
            <Text className="text-2xl font-black text-text-primary dark:text-text-primary-dark mb-2">
              {selectedTask.title}
            </Text>

            {/* Meta fields */}
            <View className="gap-3 mb-6">
              {selectedTask.party_name && (
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="store" size={18} color="#6B7280" />
                  <View>
                    <Text className="text-sm text-text-secondary font-semibold uppercase tracking-wider">
                      Party
                    </Text>
                    <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                      {selectedTask.party_name}
                    </Text>
                  </View>
                </View>
              )}
              {selectedTask.due_date && (
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="calendar" size={18} color="#6B7280" />
                  <View>
                    <Text className="text-sm text-text-secondary font-semibold uppercase tracking-wider">
                      Due Date
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 4 }}>
                      <Text
                        className={`text-sm font-bold ${
                          isOverdue(selectedTask.due_date, selectedTask.status)
                            ? "text-red-500"
                            : "text-text-primary dark:text-text-primary-dark"
                        }`}
                      >
                        {formatDate(selectedTask.due_date)}
                      </Text>
                      {isOverdue(selectedTask.due_date, selectedTask.status) && (
                        <>
                          <MaterialCommunityIcons name="alert-circle" size={13} color="#EF4444" />
                          <Text className="text-sm font-bold text-red-500">Overdue</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              )}
              {selectedTask.challan_id && (
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="truck" size={18} color="#0F7A5F" />
                  <View>
                    <Text className="text-sm text-text-secondary font-semibold uppercase tracking-wider">
                      Linked Challan
                    </Text>
                    <Text className="text-sm font-bold text-primary dark:text-primary-dark">
                      #{selectedTask.challan_id}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Description */}
            {selectedTask.description && (
              <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 mb-5">
                <Text className="text-sm text-text-secondary font-semibold uppercase tracking-wider mb-2">
                  Instructions
                </Text>
                <Text className="text-sm text-text-primary dark:text-text-primary-dark leading-relaxed">
                  {selectedTask.description}
                </Text>
              </View>
            )}

            {/* Notes */}
            {selectedTask.notes && (
              <View className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/40 mb-5">
                <Text className="text-sm text-amber-700 font-semibold uppercase tracking-wider mb-1">
                  Notes
                </Text>
                <Text className="text-sm text-amber-900 dark:text-amber-300">
                  {selectedTask.notes}
                </Text>
              </View>
            )}

            {/* Actions */}
            {NEXT_STATUS[selectedTask.status] && (
              <Pressable
                onPress={() => handleAdvanceStatus(selectedTask)}
                disabled={updating}
                className="bg-primary dark:bg-primary-dark py-4 rounded-2xl items-center justify-center shadow-md active:opacity-90 mt-4 flex-row"
                style={{ gap: 8 }}
              >
                {updating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={selectedTask.status === "pending" ? "play" : "check"}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text className="text-white font-bold text-lg uppercase tracking-wider">
                      {selectedTask.status === "pending"
                        ? "Mark as In Progress"
                        : "Mark as Done"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {selectedTask.status === "done" && (
              <View className="bg-green-50 dark:bg-green-950/20 rounded-2xl p-4 items-center border border-green-200 dark:border-green-900/40 mt-4">
                <MaterialCommunityIcons name="party-popper" size={24} color="#15803D" style={{ marginBottom: 4 }} />
                <Text className="text-green-700 dark:text-green-400 font-bold text-base">
                  Task Completed
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => setSelectedTask(null)}
              className="border border-gray-200 dark:border-zinc-800 py-4 rounded-2xl items-center mt-3"
            >
              <Text className="text-text-secondary font-bold text-base">Close</Text>
            </Pressable>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}
