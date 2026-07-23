import * as SecureStore from "expo-secure-store";
import { api, ApiError } from "./api";

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
  attachment?: string;
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
        date: att.dateStr,
      });
    } catch (e: any) {
      if (e?.message?.includes("Network request failed") || e?.status === undefined) {
        remainingAtts.push(att);
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
        attachment: exp.attachment,
      });
    } catch (e: any) {
      if (e?.message?.includes("Network request failed") || e?.status === undefined) {
        remainingExps.push(exp);
      }
    }
  }
  await saveQueue(EXP_QUEUE_KEY, remainingExps);
}

// ── Offline sale queue (POS, ported from shopkeeper-app) ────────────────
// Kept as a distinct queue/key from attendance & expenses above — different
// payload shape, different sync endpoint, and callers (POS) want to know
// specifically about queued sales, not a blended count.

const SALE_QUEUE_KEY = "agent_offline_sale_queue";

export interface QueuedSale {
  id: string; // local-only reference — never a real invoice number
  queuedAt: string;
  payload: Record<string, unknown>;
}

// A sale only ever gets queued here when the checkout request never reached
// the server at all (a real network failure, not a business-logic error
// like insufficient stock or a validation failure). No invoice number is
// ever fabricated client-side — the real one is assigned atomically and
// sequentially by the server (GST compliance requires no gaps in that
// sequence); the sale simply isn't "real" yet until it actually syncs.
export function isNetworkFailure(error: unknown): boolean {
  return !(error instanceof ApiError);
}

export async function enqueueSale(payload: Record<string, unknown>): Promise<QueuedSale> {
  const queue = await getQueue<QueuedSale>(SALE_QUEUE_KEY);
  const entry: QueuedSale = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    payload,
  };
  queue.push(entry);
  await saveQueue(SALE_QUEUE_KEY, queue);
  return entry;
}

export async function getQueuedSales(): Promise<QueuedSale[]> {
  return getQueue<QueuedSale>(SALE_QUEUE_KEY);
}

export async function getQueueCount(): Promise<number> {
  return (await getQueue<QueuedSale>(SALE_QUEUE_KEY)).length;
}

// Replays queued sales in the order they were recorded (oldest first).
export async function syncQueuedSales(): Promise<{ synced: number; remaining: number }> {
  const queue = await getQueue<QueuedSale>(SALE_QUEUE_KEY);
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const stillQueued: QueuedSale[] = [];
  let synced = 0;
  for (const entry of queue) {
    try {
      await api.post("/pos/checkout", entry.payload);
      synced++;
    } catch (error) {
      if (isNetworkFailure(error)) {
        stillQueued.push(entry, ...queue.slice(queue.indexOf(entry) + 1));
        break;
      }
      console.error("[offlineQueue] dropping sale that the server rejected:", error);
    }
  }
  await saveQueue(SALE_QUEUE_KEY, stillQueued);
  return { synced, remaining: stillQueued.length };
}
