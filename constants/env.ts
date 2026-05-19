import { Platform } from "react-native";

const DEV_SERVER_IP =
  process.env.EXPO_PUBLIC_DEV_SERVER_IP || "192.168.123.53";

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "5000";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function stripApiPath(url: string): string {
  return normalizeBaseUrl(url).replace(/\/api\/?$/, "");
}

export function getApiBaseUrl(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envBaseUrl && envBaseUrl.trim()) {
    return normalizeBaseUrl(envBaseUrl);
  }

  // Web browser
  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}/api`;
  }

  // Android phone or Expo Go
  if (Platform.OS === "android") {
    return `http://${DEV_SERVER_IP}:${API_PORT}/api`;
  }

  // iPhone
  if (Platform.OS === "ios") {
    return `http://${DEV_SERVER_IP}:${API_PORT}/api`;
  }

  return `http://${DEV_SERVER_IP}:${API_PORT}/api`;
}

export function getSocketBaseUrl(): string {
  const envWsUrl = process.env.EXPO_PUBLIC_WS_URL;

  if (envWsUrl && envWsUrl.trim()) {
    return normalizeBaseUrl(envWsUrl);
  }

  return stripApiPath(getApiBaseUrl());
}

export function getApiTimeoutMs(): number {
  const raw = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;

  return Number.isFinite(parsed) ? parsed : 15000;
}