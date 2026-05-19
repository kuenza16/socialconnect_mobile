import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { setUnauthorizedHandler, testApiConnection } from "@/services/api";
import {
    AuthUser,
    clearAuthData,
    getCurrentUser,
    getToken,
    setAuthData,
} from "@/utils/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (nextToken: string, nextUser: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext(undefined as AuthContextValue | undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const BOOTSTRAP_TIMEOUT_MS = 12000;

  const logout = useCallback(async () => {
    await clearAuthData();
    setUser(null);
    setToken(null);
  }, []);

  const login = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    await setAuthData(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await Promise.race([
          (async () => {
            const [savedToken, savedUser, connection] = await Promise.all([
              getToken(),
              getCurrentUser(),
              testApiConnection(),
            ]);

            if (__DEV__) {
              globalThis.console?.log?.(
                "[Startup] API connection:",
                connection,
              );
            }

            if (!mounted) {
              return;
            }

            setToken(savedToken);
            setUser(savedUser as AuthUser | null);
          })(),
          new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("Bootstrap timeout")),
              BOOTSTRAP_TIMEOUT_MS,
            );
          }),
        ]);
      } catch (error) {
        if (__DEV__) {
          globalThis.console?.log?.("[Startup] bootstrap warning:", error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  const value: AuthContextValue = useMemo(() => {
    return {
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
    };
  }, [user, token, loading, login, logout]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
