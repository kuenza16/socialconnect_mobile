import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import API from "@/services/api";

interface ChatFriend {
  _id: string;
  name: string;
  email: string;
  peerUserId?: string;
  chatId?: string;
}

function extractConversationId(raw: any): string {
  if (!raw) {
    return "";
  }

  if (typeof raw === "string" || typeof raw === "number") {
    return String(raw);
  }

  return String(
    raw.conversationId ??
      raw.chatId ??
      raw._id ??
      raw.id ??
      raw?.conversation?._id ??
      raw?.conversation?.id ??
      raw?.data?._id ??
      raw?.data?.id ??
      raw?.data?.conversationId ??
      "",
  );
}

type IncomingMessage = {
  _id?: string;
  id?: string;
  content?: string;
  message?: string;
  text?: string;
  sender?: any;
  user?: any;
  from?: any;
  receiver?: any;
  to?: any;
  senderId?: string;
  receiverId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LivePreview = {
  text: string;
  timestamp: number;
  unreadCount: number;
};

function extractId(raw: any): string | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string" || typeof raw === "number") {
    return String(raw);
  }

  if (typeof raw === "object") {
    const id = raw._id ?? raw.id ?? raw.userId;
    return id ? String(id) : null;
  }

  return null;
}

function extractMessageText(raw: IncomingMessage): string {
  return String(raw.content ?? raw.message ?? raw.text ?? "").trim();
}

function normalizeFriend(raw: any, index: number): ChatFriend {
  const primaryId = String(raw?._id ?? raw?.id ?? `friend-${index}`);
  const nestedUserId = extractId(raw?.user ?? raw?.friend ?? raw?.receiver);
  const peerUserId =
    extractId(raw?.peerUserId) ||
    extractId(raw?.userId) ||
    extractId(raw?.friendId) ||
    extractId(raw?.receiverId) ||
    nestedUserId ||
    undefined;

  return {
    _id: primaryId,
    name: String(raw?.name ?? raw?.username ?? raw?.fullName ?? "Unknown user"),
    email: String(raw?.email ?? ""),
    peerUserId,
    chatId:
      extractId(raw?.chatId) || extractId(raw?.conversationId) || undefined,
  };
}

export default function ChatScreen() {
  const { socket } = useWebSocket(true);
  const { user } = useAuth();
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [livePreviews, setLivePreviews] = useState<Record<string, LivePreview>>(
    {},
  );

  const currentUserId = user?._id ? String(user._id) : null;

  const loadFriends = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await API.get<ChatFriend[]>("/chat/friends");
      const normalized = Array.isArray(data)
        ? data.map((item, index) => normalizeFriend(item, index))
        : [];
      setFriends(normalized);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load chat friends",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const mergedFriends = useMemo(() => {
    return [...friends]
      .map((friend) => ({
        ...friend,
        preview: livePreviews[friend._id] || null,
      }))
      .sort((a, b) => {
        const aTs = a.preview?.timestamp ?? 0;
        const bTs = b.preview?.timestamp ?? 0;
        return bTs - aTs;
      });
  }, [friends, livePreviews]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnect = () => {
      console.log("Socket connected for chat");
    };

    const handleIncoming = (raw: IncomingMessage) => {
      const messageText = extractMessageText(raw);
      if (!messageText) {
        return;
      }

      const senderId = extractId(
        raw.sender ?? raw.user ?? raw.from ?? raw.senderId,
      );
      const receiverId = extractId(raw.receiver ?? raw.to ?? raw.receiverId);

      const candidatePeerIds = [senderId, receiverId].filter(
        (id): id is string => Boolean(id) && id !== currentUserId,
      );

      const peerId = candidatePeerIds[0];
      if (!peerId) {
        return;
      }

      const isIncoming = senderId !== null && senderId !== currentUserId;

      setLivePreviews((prev) => {
        const existing = prev[peerId];
        return {
          ...prev,
          [peerId]: {
            text: messageText,
            timestamp: Date.now(),
            unreadCount: isIncoming
              ? (existing?.unreadCount ?? 0) + 1
              : (existing?.unreadCount ?? 0),
          },
        };
      });
    };

    socket.on("connect", handleConnect);
    socket.on("new-message", handleIncoming);
    socket.on("newMessage", handleIncoming);
    socket.on("message", handleIncoming);
    socket.on("chat:message", handleIncoming);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new-message", handleIncoming);
      socket.off("newMessage", handleIncoming);
      socket.off("message", handleIncoming);
      socket.off("chat:message", handleIncoming);
    };
  }, [socket, currentUserId]);

  const openChat = async (friend: ChatFriend) => {
    const friendId = String(friend._id || "");
    if (!friendId || friendId.startsWith("friend-")) {
      return;
    }

    const routeFriendId = friend.peerUserId || friendId;

    let conversationId = friend.chatId || "";
    if (!conversationId) {
      try {
        const { data } = await API.post(`/chat/conversation/${routeFriendId}`);
        conversationId = extractConversationId(data);
      } catch (error: any) {
        if (__DEV__) {
          globalThis.console?.log?.(
            "[Chat] conversation create/fetch failed:",
            error?.response?.data || error?.message,
          );
        }
      }
    }

    setLivePreviews((prev) => {
      const next = { ...prev };
      if (next[friendId]) {
        next[friendId] = {
          ...next[friendId],
          unreadCount: 0,
        };
      }
      return next;
    });

    router.push({
      pathname: "/chat/[friendId]",
      params: {
        friendId: routeFriendId,
        friendName: friend.name,
        peerUserId: friend.peerUserId,
        chatId: conversationId || friend.chatId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Chat"
        subtitle="Your conversations"
        rightIcon="refresh"
        onPressRight={() => loadFriends(true)}
      />

      {loading ? (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>Loading chats...</Text>
          <Text style={styles.placeholderText}>
            Fetching your conversations.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={mergedFriends}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFriends(true)}
          />
        }
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Add friends and start chatting to see threads here.
              </Text>
            </View>
          ) : null
        }
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
            onPress={() => openChat(item)}
          >
            <View style={styles.friendRowTop}>
              <Text style={styles.friendName}>{item.name}</Text>
              {item.preview?.unreadCount ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.preview.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.friendEmail}>
              {item.email || "No email available"}
            </Text>
            {item.preview?.text ? (
              <Text numberOfLines={1} style={styles.previewText}>
                {item.preview.text}
              </Text>
            ) : (
              <Text numberOfLines={1} style={styles.previewTextMuted}>
                Tap to open chat
              </Text>
            )}
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
  friendRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  friendName: {
    fontSize: Typography.title,
    color: Colors.black,
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
  friendEmail: {
    marginTop: 2,
    color: Colors.gray,
    fontSize: Typography.body,
  },
  previewText: {
    marginTop: Spacing.xs,
    color: Colors.black,
    fontSize: Typography.body,
  },
  previewTextMuted: {
    marginTop: Spacing.xs,
    color: Colors.gray,
    fontSize: Typography.body,
  },
  emptyContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.black,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: Spacing.xs,
    color: Colors.gray,
    fontSize: Typography.body,
  },
});
