import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Spacing, Typography } from "@/constants/Colors";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPressRight?: () => void;
  rightActions?: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }>;
}

export default function AppHeader({
  title,
  subtitle,
  rightIcon,
  onPressRight,
  rightActions,
}: AppHeaderProps) {
  const actions =
    rightActions && rightActions.length > 0
      ? rightActions
      : rightIcon && onPressRight
        ? [{ icon: rightIcon, onPress: onPressRight }]
        : [];

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={`${action.icon}-${index}`}
              style={styles.iconButton}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={20} color={Colors.black} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: Typography.headline,
    fontWeight: "700",
    color: Colors.black,
  },
  subtitle: {
    marginTop: 2,
    fontSize: Typography.body,
    color: Colors.gray,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
