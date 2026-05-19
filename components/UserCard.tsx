import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  bio?: string;
}

interface UserCardProps {
  user: UserItem;
  buttonLabel?: string;
  onPress?: () => void;
  onPressButton?: () => void;
}

export default function UserCard({
  user,
  buttonLabel,
  onPress,
  onPressButton,
}: UserCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      {buttonLabel && onPressButton ? (
        <TouchableOpacity style={styles.actionButton} onPress={onPressButton}>
          <Text style={styles.actionButtonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
  email: {
    fontSize: Typography.body,
    color: Colors.gray,
    marginTop: 2,
  },
  bio: {
    marginTop: 4,
    fontSize: Typography.body,
    color: Colors.black,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.body,
  },
});
