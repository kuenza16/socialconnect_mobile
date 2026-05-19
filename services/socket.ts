import { io, Socket } from "socket.io-client";

import { getSocketBaseUrl } from "@/constants/env";
import { getToken } from "@/utils/auth";

let socket: Socket | null = null;

export async function getSocket() {
  if (socket) {
    return socket;
  }

  const token = await getToken();
  const socketUrl = getSocketBaseUrl();

  socket = io(socketUrl, {
    transports: ["websocket"],
    autoConnect: false,
    auth: token ? { token: `Bearer ${token}` } : {},
  });

  if (__DEV__) {
    socket.on("connect", () => {
      globalThis.console?.log?.("[Socket] connected", socket?.id);
    });
    socket.on("disconnect", (reason) => {
      globalThis.console?.log?.("[Socket] disconnected", reason);
    });
    socket.on("connect_error", (err) => {
      globalThis.console?.log?.("[Socket] connect_error", err?.message);
    });
  }

  return socket;
}

export async function connectSocket() {
  const s = await getSocket();
  const token = await getToken();
  s.auth = token ? { token: `Bearer ${token}` } : {};

  if (!s.connected) {
    s.connect();
  }

  return s;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
