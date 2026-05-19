import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";
import { useAuth } from "../../hooks/useAuth";

interface RegisterResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
}

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please fill all fields.");
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await API.post<RegisterResponse>("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      await login(data.token, data.user);
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Register failed",
        error?.response?.data?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join SocialConnect today</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            style={styles.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  title: {
    fontSize: Typography.headline,
    fontWeight: "700",
    color: Colors.black,
  },
  subtitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    color: Colors.gray,
    fontSize: Typography.bodyLarge,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyLarge,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.bodyLarge,
    fontWeight: "700",
  },
  link: {
    marginTop: Spacing.lg,
    textAlign: "center",
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "600",
  },
});
