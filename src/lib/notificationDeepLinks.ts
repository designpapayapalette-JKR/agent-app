import { router } from "expo-router";

const NOTIFICATION_ROUTES: Record<string, (data: Record<string, unknown>) => string> = {
  new_order: () => "/invoice-history",
  payment_received: () => "/ledger",
  low_stock: () => "/inventory",
  task_assigned: () => "/tasks",
  expense_approved: () => "/expenses",
  attendance_alert: () => "/attendance",
};

export function handleNotificationDeepLink(data: Record<string, unknown>): void {
  const type = (data.type as string) || "";
  const routeBuilder = NOTIFICATION_ROUTES[type];
  if (routeBuilder) {
    const route = routeBuilder(data);
    router.push(route as any);
  } else {
    router.push("/notifications" as any);
  }
}
