import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth-context";
import { useTopInset } from "../../src/lib/useTopInset";
import { WalkieChannel, WalkiePeer } from "../../src/lib/walkieRtc";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  participantCount?: number;
}

const CHANNELS: Channel[] = [
  {
    id: "company-main",
    name: "Company Channel",
    description: "Main team communication",
    icon: "radio-tower",
    participantCount: 0,
  },
  {
    id: "field-ops",
    name: "Field Ops",
    description: "Field agents & delivery team",
    icon: "truck-delivery",
    participantCount: 0,
  },
];

const CONNECTION_META: Record<ConnectionState, { label: string; color: string; dotColor: string }> = {
  disconnected: { label: "Disconnected", color: "text-text-secondary", dotColor: "bg-gray-400" },
  connecting: { label: "Connecting…", color: "text-amber-600", dotColor: "bg-amber-400" },
  connected: { label: "Connected", color: "text-green-600", dotColor: "bg-green-500" },
  error: { label: "Connection Error", color: "text-red-500", dotColor: "bg-red-500" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function WalkieTalkieScreen() {
  const { user } = useAuth();
  const topInset = useTopInset();

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<WalkiePeer[]>([]);
  const channelRef = useRef<WalkieChannel | null>(null);

  // Pulse animation for the PTT button when transmitting
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTransmitting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      Animated.timing(glowAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [isTransmitting]);

  const handleJoinChannel = async (channel: Channel) => {
    setConnectionState("connecting");
    setActiveChannel(channel);

    const userName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Employee";
    const walkie = new WalkieChannel(channel.id, userName, {
      onParticipantsChanged: setParticipants,
      onConnectionStateChanged: (state) => {
        setConnectionState(state);
        if (state === "disconnected" || state === "error") {
          setIsTransmitting(false);
        }
      },
    });
    channelRef.current = walkie;

    try {
      await walkie.connect();
    } catch (e: any) {
      setConnectionState("error");
      setActiveChannel(null);
      channelRef.current = null;
      Alert.alert("Connection Failed", e?.message ?? "Could not join the channel. Check your connection and try again.");
    }
  };

  const handleLeaveChannel = () => {
    channelRef.current?.disconnect();
    channelRef.current = null;
    setIsTransmitting(false);
    setConnectionState("disconnected");
    setActiveChannel(null);
    setParticipants([]);
  };

  useEffect(() => {
    return () => {
      channelRef.current?.disconnect();
    };
  }, []);

  const handlePttPressIn = () => {
    if (connectionState !== "connected") {
      Alert.alert("Not Connected", "Join a channel first to start transmitting.");
      return;
    }
    if (isMuted) {
      Alert.alert("Microphone Muted", "Unmute to transmit.");
      return;
    }
    setIsTransmitting(true);
    channelRef.current?.setTransmitting(true);
  };

  const handlePttPressOut = () => {
    setIsTransmitting(false);
    channelRef.current?.setTransmitting(false);
  };

  const connMeta = CONNECTION_META[connectionState];

  return (
    <ScrollView
      className="flex-1 bg-[#0D1B2A] dark:bg-[#0D1B2A]"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View className="px-6 pb-6" style={{ paddingTop: topInset }}>
        <Text className="text-white text-2xl font-black">Walkie-Talkie</Text>
        <Text className="text-white/50 text-sm font-medium mt-0.5">
          Push-to-talk voice channels
        </Text>
      </View>

      {/* ── Connection Status Bar ── */}
      <View className="mx-6 mb-5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex-row items-center">
        <View className={`w-2 h-2 rounded-full mr-2.5 ${connMeta.dotColor}`} />
        <Text className={`text-sm font-bold flex-1 ${connMeta.color}`}>
          {connMeta.label}
          {activeChannel ? `  ·  ${activeChannel.name}` : ""}
        </Text>
        {connectionState === "connected" && (
          <Pressable
            onPress={handleLeaveChannel}
            className="bg-red-500/20 border border-red-500/30 px-4 py-2.5 rounded-xl active:opacity-80"
          >
            <Text className="text-red-400 text-sm font-bold">Leave</Text>
          </Pressable>
        )}
      </View>

      {/* ── Channel List ── */}
      <View className="px-6 mb-6">
        <Text className="text-white/40 text-sm font-bold uppercase tracking-widest mb-3">
          Channels
        </Text>
        <View className="gap-3">
          {CHANNELS.map((ch) => {
            const isActive = activeChannel?.id === ch.id;
            return (
              <Pressable
                key={ch.id}
                onPress={() => {
                  if (isActive) {
                    handleLeaveChannel();
                  } else {
                    handleJoinChannel(ch);
                  }
                }}
                disabled={
                  connectionState === "connecting" ||
                  (!!activeChannel && !isActive)
                }
                className={`rounded-2xl p-4 border flex-row items-center ${
                  isActive
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-white/5 border-white/10"
                } active:opacity-80`}
              >
                <View
                  className={`w-11 h-11 rounded-2xl justify-center items-center mr-3 ${
                    isActive ? "bg-green-500/20" : "bg-white/10"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={ch.icon as any}
                    size={22}
                    color={isActive ? "#4ADE80" : "#FFFFFF"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold text-base ${
                      isActive ? "text-green-400" : "text-white"
                    }`}
                  >
                    {ch.name}
                  </Text>
                  <Text className="text-white/40 text-sm mt-0.5">
                    {ch.description}
                  </Text>
                </View>
                {isActive && connectionState === "connecting" ? (
                  <View className="bg-amber-400/20 px-2 py-1 rounded-lg">
                    <Text className="text-amber-400 text-sm font-bold">
                      Joining…
                    </Text>
                  </View>
                ) : isActive ? (
                  <View className="bg-green-500/20 px-2 py-1 rounded-lg">
                    <Text className="text-green-400 text-sm font-bold">
                      ● LIVE
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white/30 text-sm font-semibold">
                    Join →
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── PTT Big Button ── */}
      <View className="px-6 items-center mb-8">
        <Text className="text-white/40 text-sm font-bold uppercase tracking-widest mb-5">
          Push to Talk
        </Text>

        {/* Glow ring */}
        <Animated.View
          style={{
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          }}
          className="absolute w-48 h-48 rounded-full bg-green-500/20"
        />
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }] }}
        >
          <Pressable
            onPressIn={handlePttPressIn}
            onPressOut={handlePttPressOut}
            disabled={connectionState !== "connected"}
            className={`w-44 h-44 rounded-full justify-center items-center border-4 ${
              isTransmitting
                ? "bg-green-500 border-green-300 shadow-lg"
                : connectionState === "connected"
                ? "bg-white/10 border-white/20 active:bg-green-500/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            <MaterialCommunityIcons
              name={isTransmitting ? "microphone" : "radio-handheld"}
              size={48}
              color="#FFFFFF"
              style={{ marginBottom: 4 }}
            />
            <Text
              className={`text-sm font-black uppercase tracking-widest ${
                isTransmitting
                  ? "text-white"
                  : connectionState === "connected"
                  ? "text-white/60"
                  : "text-white/20"
              }`}
            >
              {isTransmitting
                ? "TRANSMITTING"
                : connectionState === "connected"
                ? "HOLD TO TALK"
                : "JOIN A CHANNEL"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Mute toggle */}
        {connectionState === "connected" && (
          <Pressable
            onPress={() => {
              const next = !isMuted;
              setIsMuted(next);
              channelRef.current?.setMuted(next);
              if (next) setIsTransmitting(false);
            }}
            className={`mt-6 flex-row items-center gap-2 px-5 py-3.5 rounded-2xl border ${
              isMuted
                ? "bg-red-500/15 border-red-500/30"
                : "bg-white/5 border-white/10"
            } active:opacity-80`}
          >
            <MaterialCommunityIcons
              name={isMuted ? "volume-off" : "volume-high"}
              size={18}
              color={isMuted ? "#F87171" : "#FFFFFF"}
            />
            <Text
              className={`text-sm font-bold ${
                isMuted ? "text-red-400" : "text-white/60"
              }`}
            >
              {isMuted ? "Microphone Muted" : "Mic Active"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Participants ── */}
      {connectionState === "connected" && (
        <View className="px-6 mb-8">
          <Text className="text-white/40 text-sm font-bold uppercase tracking-widest mb-3">
            In This Channel
          </Text>
          <View className="bg-white/5 border border-white/10 rounded-2xl p-4 gap-3">
            {/* Self */}
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 justify-center items-center">
                <Text className="text-green-400 font-black text-sm">
                  {getInitials(user?.first_name ?? "Me")}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">
                  {user?.first_name} {user?.last_name}{" "}
                  <Text className="text-green-400 text-sm font-bold">
                    (You)
                  </Text>
                </Text>
              </View>
              <View className={`w-2 h-2 rounded-full ${isTransmitting ? "bg-green-500" : "bg-white/20"}`} />
            </View>

            {/* Other participants */}
            {participants.map((peer) => (
              <View key={peer.userId} className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-white/10 justify-center items-center">
                  <Text className="text-white/60 font-black text-sm">
                    {getInitials(peer.userName)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white/80 font-semibold text-sm">
                    {peer.userName}
                  </Text>
                </View>
                <View className="w-2 h-2 rounded-full bg-green-500/60" />
              </View>
            ))}
            {participants.length === 0 && (
              <Text className="text-white/30 text-sm">
                No one else has joined this channel yet.
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
