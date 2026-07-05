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
} from "react-native";
import { useAuth } from "../../src/lib/auth-context";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View className="px-6 py-12 justify-center flex-1 max-w-md mx-auto w-full">
          {/* Logo / Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-primary dark:bg-primary-dark rounded-2xl items-center justify-center shadow-lg mb-4">
              <Text className="text-white text-3xl font-bold">A</Text>
            </View>
            <Text className="text-3xl font-extrabold text-text-primary dark:text-text-primary-dark text-center tracking-tight">
              Agent ERP
            </Text>
            <Text className="text-text-secondary dark:text-text-secondary-dark text-center mt-2 font-medium">
              Field Agent Companion App
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-surface dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl">
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
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base font-medium focus:border-primary dark:focus:border-primary-dark"
                />
              </View>
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="bg-primary dark:bg-primary-dark mt-6 py-5 rounded-xl items-center active:opacity-90 shadow-md"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
