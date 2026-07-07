import * as SecureStore from "expo-secure-store";
import { api } from "./api";

export interface QueuedAttendance {
  notes: string;
  isRemote: boolean;
  workLocation: string;
  latitude?: number;
  longitude?: number;
  dateStr: string;
}

export interface QueuedExpense {
  category: string;
  amount: number;
  notes?: string;
  dateStr: string;
}

const ATT_QUEUE_KEY = "offline_attendance_queue";
const EXP_QUEUE_KEY = "offline_expense_queue";

async function getQueue<T>(key: string): Promise<T[]> {
  try {
    const data = await SecureStore.getItemAsync(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveQueue<T>(key: string, queue: T[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(queue));
  } catch {}
}

export async function queueAttendance(item: QueuedAttendance): Promise<void> {
  const q = await getQueue<QueuedAttendance>(ATT_QUEUE_KEY);
  q.push(item);
  await saveQueue(ATT_QUEUE_KEY, q);
}

export async function queueExpense(item: QueuedExpense): Promise<void> {
  const q = await getQueue<QueuedExpense>(EXP_QUEUE_KEY);
  q.push(item);
  await saveQueue(EXP_QUEUE_KEY, q);
}

export async function getQueuedCount(): Promise<number> {
  const att = await getQueue(ATT_QUEUE_KEY);
  const exp = await getQueue(EXP_QUEUE_KEY);
  return att.length + exp.length;
}

export async function syncQueuedData(): Promise<void> {
  const atts = await getQueue<QueuedAttendance>(ATT_QUEUE_KEY);
  const exps = await getQueue<QueuedExpense>(EXP_QUEUE_KEY);

  // Sync attendance
  const remainingAtts: QueuedAttendance[] = [];
  for (const att of atts) {
    try {
      await api.post("/attendance/check-in", {
        notes: att.notes + " (Synced Offline)",
        isRemote: att.isRemote,
        workLocation: att.workLocation,
        latitude: att.latitude,
        longitude: att.longitude,
      });
    } catch (e: any) {
      if (e?.message?.includes("Network request failed") || !e?.status) {
        remainingAtts.push(att); // keep in queue if network failure
      }
    }
  }
  await saveQueue(ATT_QUEUE_KEY, remainingAtts);

  // Sync expenses
  const remainingExps: QueuedExpense[] = [];
  for (const exp of exps) {
    try {
      await api.post("/expenses", {
        category: exp.category,
        amount: exp.amount,
        notes: exp.notes ? exp.notes + " (Synced Offline)" : "Synced Offline",
        date: exp.dateStr,
      });
    } catch (e: any) {
      if (e?.message?.includes("Network request failed") || !e?.status) {
        remainingExps.push(exp);
      }
    }
  }
  await saveQueue(EXP_QUEUE_KEY, remainingExps);
}
