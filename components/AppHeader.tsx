import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Spacing, Typography } from "@/constants/Colors";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPressRight?: () => void;
}

export default function AppHeader({
  title,
  subtitle,
  rightIcon,
  onPressRight,
}: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {rightIcon && onPressRight ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressRight}
          activeOpacity={0.8}
        >
          <Ionicons name={rightIcon} size={20} color={Colors.black} />
        </TouchableOpacity>
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
