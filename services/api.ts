import { AxiosError, AxiosRequestConfig, create } from "axios";

import { API_BASE_URL, API_TIMEOUT_MS } from "@/constants/env";
import { clearAuthData, getToken } from "@/utils/auth";

let unauthorizedHandler: (() => void) | null = null;

type RetryRequestConfig = AxiosRequestConfig & { __retryCount?: number };

const RETRYABLE_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];
const MAX_RETRIES = 2;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

const API = create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: AxiosError) {
  if (!error.config) {
    return false;
  }

  if (!error.response) {
    // Network error, DNS issue, CORS/proxy disconnect, backend down, etc.
    return true;
  }

  return RETRYABLE_STATUS_CODES.includes(error.response.status);
}

export function getApiErrorMessage(error: unknown) {
  const maybeAxios = error as any;

  if (maybeAxios?.response?.data?.message) {
    return String(maybeAxios.response.data.message);
  }

  if (maybeAxios?.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }

  if (!maybeAxios?.response) {
    return "Cannot reach server. Check WSL backend, emulator host, and proxy settings.";
  }

  return "Something went wrong. Please try again.";
}

API.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (__DEV__) {
    const method = (config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    globalThis.console?.log?.(`[API] ${method} ${url}`);
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    const config = axiosError.config as RetryRequestConfig | undefined;

    if (config && shouldRetry(axiosError)) {
      const retryCount = config.__retryCount ?? 0;

      if (retryCount < MAX_RETRIES) {
        config.__retryCount = retryCount + 1;
        const delayMs = 350 * Math.pow(2, retryCount);

        if (__DEV__) {
          globalThis.console?.log?.(
            `[API] retrying (${config.__retryCount}/${MAX_RETRIES}) in ${delayMs}ms`,
          );
        }

        await sleep(delayMs);
        return API.request(config);
      }
    }

    if (error?.response?.status === 401) {
      await clearAuthData();
      unauthorizedHandler?.();
    }

    if (__DEV__) {
      globalThis.console?.log?.("[API] Error:", getApiErrorMessage(error));
    }

    return Promise.reject(error);
  },
);

export async function testApiConnection() {
  try {
    // We intentionally call '/' relative to baseURL; even a 404 means network path is OK.
    await API.get("/", { timeout: 4000 });
    return { ok: true, reason: "reachable" as const };
  } catch (error: any) {
    if (error?.response) {
      return { ok: true, reason: "reachable-with-http-error" as const };
    }

    return {
      ok: false,
      reason: "unreachable" as const,
      message: getApiErrorMessage(error),
    };
  }
}

export default API;
