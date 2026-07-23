import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth-context";

// Bold gradient hero + floating card + gradient CTA — mirrors
// shopkeeper-app's login redesign (see memory feedback_ui_visual_quality.md:
// the earlier flat-white/plain-card treatment read as "boring/old school"
// despite correct brand tokens). Pattern from the myBillBook/PNB references
// in data/Mobile App Ref.
function LoginHero() {
  return (
    <LinearGradient
      colors={["#0368FE", "#000D3A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 72,
        paddingBottom: 56,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <View style={{ position: "absolute", top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)" }} />
      <View style={{ position: "absolute", bottom: -50, left: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(3,168,254,0.18)" }} />

      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: 0.2 }}>
        ManageMyCounter
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "600", marginTop: 4 }}>
        Employee Companion App
      </Text>
    </LinearGradient>
  );
}

function GradientButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
      <LinearGradient
        colors={disabled ? ["#93B8FB", "#93B8FB"] : ["#0368FE", "#03A8FE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          marginTop: 24,
          paddingVertical: 18,
          borderRadius: 16,
          alignItems: "center",
          shadowColor: "#0368FE",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0 : 0.35,
          shadowRadius: 14,
          elevation: disabled ? 0 : 6,
        }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <LoginHero />
        <View className="px-6 pb-12 flex-1 max-w-md mx-auto w-full" style={{ marginTop: -32 }}>
          {/* Form Card */}
          <View
            className="bg-surface dark:bg-surface-dark p-6 rounded-3xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-6">
              Sign In to Account
            </Text>

            {error && (
              <View className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded-xl mb-4">
                <Text className="text-error font-semibold text-base">{error}</Text>
              </View>
            )}

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-2">
                  Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base font-medium focus:border-primary dark:focus:border-primary-dark"
                />
              </View>

              <View className="mt-4">
                <Text className="text-sm font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-2">
                  Password
                </Text>
                <View className="relative justify-center">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#A0A0A0"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 pr-12 text-base font-medium focus:border-primary dark:focus:border-primary-dark"
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    style={{ position: "absolute", right: 14 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6B7280" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Login Button */}
            <GradientButton label="Sign In" onPress={handleLogin} disabled={loading} loading={loading} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
