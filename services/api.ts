import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { clearAuthData, getToken } from "@/utils/auth";
import { getApiBaseUrl, getApiTimeoutMs } from "@/constants/env";

export const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT_MS = getApiTimeoutMs();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: AxiosError) {
  if (!error.config) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export function getApiErrorMessage(error: unknown) {
  if (!error) {
    return "Request failed";
  }

  const maybeAxios = error as any;
  const responseMessage = maybeAxios?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  const code = maybeAxios?.code;
  if (code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }

  if (!maybeAxios?.response) {
    return "Network error. Check your connection and server IP.";
  }

  return "Request failed";
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

API.interceptors.request.use(async (req) => {
  const token = await getToken();

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  if (__DEV__) {
    const method = (req.method || "GET").toUpperCase();
    const url = `${req.baseURL || ""}${req.url || ""}`;
    globalThis.console?.log?.(`[API] ${method} ${url}`);
  }

  return req;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    const config = axiosError.config as (AxiosRequestConfig & { __retryCount?: number }) | undefined;

    if (axiosError.response?.status === 401) {
      await clearAuthData();
    }

    if (config && shouldRetry(axiosError)) {
      const retryCount = config.__retryCount ?? 0;
      const maxRetries = 2;

      if (retryCount < maxRetries) {
        config.__retryCount = retryCount + 1;
        const delayMs = 400 * Math.pow(2, retryCount);
        await sleep(delayMs);
        return API.request(config);
      }
    }

    if (__DEV__) {
      globalThis.console?.log?.("[API] Error:", getApiErrorMessage(error));
    }

    return Promise.reject(error);
  },
);

export default API;
