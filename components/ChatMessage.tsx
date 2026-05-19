import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import { formatRelativeDate } from "@/utils/date";

export interface ChatMessageItem {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

interface ChatMessageProps {
  message: ChatMessageItem;
  currentUserId?: string;
}

export default function ChatMessage({
  message,
  currentUserId,
}: ChatMessageProps) {
  const isMe = currentUserId && message.senderId === currentUserId;

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
      <View
        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
      >
        <Text style={[styles.text, isMe ? styles.textMe : styles.textOther]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
          {formatRelativeDate(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  rowMe: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: Typography.bodyLarge,
  },
  textMe: {
    color: Colors.white,
  },
  textOther: {
    color: Colors.black,
  },
  time: {
    marginTop: 2,
    fontSize: 11,
  },
  timeMe: {
    color: "#e8f1ff",
  },
  timeOther: {
    color: Colors.gray,
  },
});
