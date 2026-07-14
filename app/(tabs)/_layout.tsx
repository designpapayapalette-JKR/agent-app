import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTerminology } from "../../src/lib/terminology-context";

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
      color={focused ? "#0F7A5F" : "#9E9E9E"}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTerminology();

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
        tabBarActiveTintColor: "#0F7A5F",
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
        name="attendance"
        options={{
          title: t("attendance").split(" ")[0],
          tabBarIcon: ({ focused }) => (
            <TabIcon active="map-marker-check" inactive="map-marker-check-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("staff")?.includes("कामगार") ? "कार्य" : "Tasks",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="checkbox-marked-circle" inactive="checkbox-marked-circle-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t("expenses").split(" ")[0],
          tabBarIcon: ({ focused }) => (
            <TabIcon active="receipt" inactive="receipt" focused={focused} />
          ),
        }}
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
