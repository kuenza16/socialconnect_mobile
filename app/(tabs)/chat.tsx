import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import { useWebSocket } from "@/hooks/useWebSocket";
import API from "@/services/api";

interface ChatFriend {
  _id: string;
  name: string;
  email: string;
}

export default function ChatScreen() {
  const { socket } = useWebSocket(true);
  const [friends, setFriends] = useState<ChatFriend[]>([]);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const { data } = await API.get<ChatFriend[]>("/chat/friends");
        setFriends(Array.isArray(data) ? data : []);
      } catch (error: any) {
        Alert.alert(
          "Error",
          error?.response?.data?.message || "Failed to load chat friends",
        );
      }
    };

    loadFriends();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Placeholder for real-time events (new-message, typing, etc.)
    const handleConnect = () => {
      // eslint-disable-next-line no-console
      console.log("Socket connected for chat");
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Chat" subtitle="Your conversations" />

      <FlatList
        data={friends}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderTitle}>Voice/Video calls</Text>
            <Text style={styles.placeholderText}>
              Placeholder only — WebRTC UI comes later.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendCard}
            onPress={() =>
              Alert.alert(
                "Coming soon",
                `Chat detail for ${item.name} will be implemented next.`,
              )
            }
          >
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendEmail}>{item.email}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  placeholderContainer: {
    margin: Spacing.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  placeholderTitle: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
  placeholderText: {
    marginTop: Spacing.xs,
    color: Colors.gray,
  },
  friendCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  friendName: {
    fontSize: Typography.title,
    color: Colors.black,
    fontWeight: "700",
  },
  friendEmail: {
    marginTop: 2,
    color: Colors.gray,
    fontSize: Typography.body,
  },
});
