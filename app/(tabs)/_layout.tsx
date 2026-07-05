import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  // Fixed height/padding here assumed every device has the same gesture-nav
  // footprint, which put the tab bar behind the system nav buttons/gesture
  // bar on devices with a taller bottom inset (3-button nav, some OEM skins).
  const insets = useSafeAreaInsets();

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
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="home" inactive="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="map-marker-check" inactive="map-marker-check-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="checkbox-marked-circle" inactive="checkbox-marked-circle-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="walkie-talkie"
        options={{
          title: "Voice",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="radio-handheld" inactive="radio-handheld" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="receipt" inactive="receipt" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon active="account-circle" inactive="account-circle-outline" focused={focused} />
          ),
        }}
      />
      {/* Hidden screen — not a visible tab, shown by navigation guard on first login */}
      <Tabs.Screen
        name="location-permission"
        options={{
          href: null, // exclude from tab bar
          title: "Location Permission",
        }}
      />
      <Tabs.Screen name="salary" options={{ href: null, title: "My Salary" }} />
      <Tabs.Screen name="documents" options={{ href: null, title: "My Documents" }} />
    </Tabs>
  );
}
