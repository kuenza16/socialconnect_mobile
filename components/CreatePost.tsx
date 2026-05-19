import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";

interface CreatePostProps {
  onCreated?: () => void;
}

export default function CreatePost({ onCreated }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert("Validation", "Please write something first.");
      return;
    }

    try {
      setLoading(true);
      await API.post("/posts", { content: trimmed });
      setContent("");
      onCreated?.();
    } catch (error: any) {
      Alert.alert(
        "Create post failed",
        error?.response?.data?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        multiline
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleCreate}
        style={styles.button}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>Post</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    margin: Spacing.lg,
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: 80,
    maxHeight: 160,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.bodyLarge,
    color: Colors.black,
  },
  button: {
    marginTop: Spacing.md,
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.body,
  },
});
