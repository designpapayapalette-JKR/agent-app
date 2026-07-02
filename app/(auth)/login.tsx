import { Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
      <Text className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
        Agent
      </Text>
      <Text className="mt-2 text-center text-text-secondary dark:text-text-secondary-dark">
        Phone/OTP login — placeholder (Phase 3){"\n"}
        Location permission screen comes right after this, per the Stitch brief — treat it as a
        trust-building screen, not boilerplate.
      </Text>
    </View>
  );
}
