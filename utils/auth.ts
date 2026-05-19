import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_TOKEN_KEY = "@socialconnect/token";
export const AUTH_USER_KEY = "@socialconnect/user";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getCurrentUser<T = AuthUser>(): Promise<T | null> {
  const value = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setAuthData(
  token: string,
  user: AuthUser,
): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}
