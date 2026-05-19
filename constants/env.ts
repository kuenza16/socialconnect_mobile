import { Platform } from "react-native";

/**
 * Android emulator reaches host machine through 10.0.2.2.
 * In WSL setups, Windows forwards localhost:5000 to WSL when backend is bound correctly.
 */
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const DEFAULT_MOBILE_HOST = "192.168.123.53";
const DEFAULT_PORT = "5000";

function normalize(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getDefaultHost() {
  if (Platform.OS === "web") {
    return "localhost";
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_ANDROID_HOST || ANDROID_EMULATOR_HOST;
  }

  return process.env.EXPO_PUBLIC_MOBILE_HOST || DEFAULT_MOBILE_HOST;
}

function fallbackApiUrl() {
  const host = getDefaultHost();
  return `http://${host}:${DEFAULT_PORT}/api`;
}

function fallbackWsUrl() {
  const host = getDefaultHost();
  return `http://${host}:${DEFAULT_PORT}`;
}

export const API_BASE_URL = normalize(
  process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiUrl(),
);
export const WS_URL = normalize(
  process.env.EXPO_PUBLIC_WS_URL || fallbackWsUrl(),
);
export const API_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 15000,
);

if (__DEV__) {
  // Connection diagnostics for emulator/WSL issues.
  globalThis.console?.log?.("[ENV] Platform:", Platform.OS);
  globalThis.console?.log?.("[ENV] API_BASE_URL:", API_BASE_URL);
  globalThis.console?.log?.("[ENV] WS_URL:", WS_URL);
}
