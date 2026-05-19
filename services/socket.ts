import { io, Socket } from "socket.io-client";

import { WS_URL } from "@/constants/env";
import { getToken } from "@/utils/auth";

let socket: Socket | null = null;

function setupDebugListeners(client: Socket) {
  if (!__DEV__) {
    return;
  }

  client.on("connect", () => {
    globalThis.console?.log?.("[Socket] connected", client.id);
  });

  client.on("disconnect", (reason) => {
    globalThis.console?.log?.("[Socket] disconnected", reason);
  });

  client.on("connect_error", (error) => {
    globalThis.console?.log?.("[Socket] connect_error", error?.message);
  });
}

export async function getSocketClient() {
  if (socket) {
    return socket;
  }

  const token = await getToken();

  socket = io(WS_URL, {
    autoConnect: false,
    path: "/socket.io",
    transports: ["websocket", "polling"],
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: token ? { token: `Bearer ${token}` } : {},
  });

  setupDebugListeners(socket);

  return socket;
}

export async function connectSocket() {
  const client = await getSocketClient();
  const token = await getToken();
  client.auth = token ? { token: `Bearer ${token}` } : {};

  if (!client.connected) {
    client.connect();
  }

  return client;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
