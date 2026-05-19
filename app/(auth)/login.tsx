import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

import API, { getApiErrorMessage } from "@/services/api";
import { getToken, setAuthData } from "@/utils/auth";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const router = useRouter();

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const canSubmit = useMemo(() => {
    return Boolean(form.email.trim()) && Boolean(form.password);
  }, [form.email, form.password]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const token = await getToken();
        if (token && isMounted) {
          router.replace("/(tabs)");
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = useCallback(async () => {
    setError("");

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await API.post("/auth/login", { email, password });
      await setAuthData(res.data.token, res.data.user);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [form.email, form.password, router]);

  const handleGoToRegister = useCallback(() => {
    Alert.alert("Coming next", "Register screen is next in the conversion order.");
  }, []);

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.bootstrapContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>SocialConnect</Text>
            <Text style={styles.title}>Login</Text>
          </View>

          <View style={styles.card}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={form.password}
                onChangeText={(password) =>
                  setForm((prev) => ({ ...prev, password }))
                }
                placeholder="Your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit || isSubmitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (!canSubmit || isSubmitting) && styles.primaryButtonDisabled,
                pressed && canSubmit && !isSubmitting && styles.primaryButtonPressed,
              ]}>
              {isSubmitting ? (
                <View style={styles.buttonRow}>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>No account?</Text>
              <Pressable onPress={handleGoToRegister} hitSlop={10}>
                <Text style={styles.footerLink}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  safeArea: {
    flex: 1,
    backgroundColor: "#0b1220",
  },

  bootstrapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1220",
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },

  header: {
    alignItems: "center",
    marginBottom: 18,
  },

  logo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },

  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#e2e8f0",
    letterSpacing: 0.3,
  },

  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#93c5fd",
  },

  card: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
  },

  errorText: {
    color: "#fca5a5",
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },

  field: {
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 6,
  },

  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    color: "#e2e8f0",
    fontSize: 15,
  },

  primaryButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1877f2",
  },

  primaryButtonPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  footerText: {
    color: "#94a3b8",
    fontSize: 13,
  },

  footerLink: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "700",
  },
});

