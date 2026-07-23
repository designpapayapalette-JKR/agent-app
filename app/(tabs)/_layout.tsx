import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTerminology } from "../../src/lib/terminology-context";
import { useAuth } from "../../src/lib/auth-context";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function TabIcon({
  active,
  inactive,
  focused,
}: {
  active: IconName;
  inactive: IconName;
  focused: boolean;
}) {
  return (
    <MaterialCommunityIcons
      name={focused ? active : inactive}
      size={focused ? 24 : 22}
      color={focused ? "#0368FE" : "#9E9E9E"}
    />
  );
}

// Field Agent keeps its original fixed 5-tab shape (Home/Attendance/Tasks/
// Expenses/Profile) — its job is a handful of daily actions, not a
// browsable module grid. Cashier/Store Manager/Warehouse Manager get a
// slimmer tab bar (Home + POS where relevant + Me) since everything else
// lives in Home's role-scoped module grid (moduleCategories.ts) — same
// "3-tab bar, modules live in the grid" principle shopkeeper-app's admin
// app uses. Hidden-but-registered screens use `href: null` rather than
// being omitted from JSX, so direct navigation to them still works.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTerminology();
  const { userRole } = useAuth();

  const isFieldAgent = userRole === "field_agent";
  const isWarehouseManager = userRole === "warehouse_manager";
  const showPos = userRole === "staff" || userRole === "manager";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#0368FE",
        tabBarInactiveTintColor: "#9E9E9E",
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ focused }) => (
            <TabIcon active="home" inactive="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          href: showPos ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="point-of-sale" inactive="point-of-sale" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: t("attendance").split(" ")[0],
          href: isFieldAgent ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="map-marker-check" inactive="map-marker-check-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("staff")?.includes("कामगार") ? "कार्य" : "Tasks",
          href: isFieldAgent ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="checkbox-marked-circle" inactive="checkbox-marked-circle-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t("expenses").split(" ")[0],
          href: isFieldAgent ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="receipt" inactive="receipt" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Stock",
          href: isWarehouseManager ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="package-variant-closed" inactive="package-variant-closed" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock-transfer-requests"
        options={{
          title: "Transfers",
          href: isWarehouseManager ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="transfer" inactive="transfer" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase-entry"
        options={{
          title: "Purchases",
          href: isWarehouseManager ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="truck" inactive="truck" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="challans"
        options={{
          title: "Challans",
          href: isWarehouseManager ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="clipboard-list" inactive="clipboard-list" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: "Ledger",
          href: null,
          tabBarIcon: ({ focused }) => (
            <TabIcon active="account-group" inactive="account-group" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="b2b"
        options={{ title: "B2B", href: null }}
      />
      <Tabs.Screen
        name="estimates"
        options={{ title: "Estimates", href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("staff")?.includes("कामगार") ? "प्रोफ़ाइल" : "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="account-circle" inactive="account-circle-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
