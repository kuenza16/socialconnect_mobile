import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

import { connectSocket, disconnectSocket } from "@/services/socket";

export function useWebSocket(enabled = true) {
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = useCallback(async () => {
    const client = await connectSocket();
    setSocket(client);
    return client;
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!enabled) {
      return;
    }

    connect().then((client) => {
      if (mounted) {
        setSocket(client);
      }
    });

    return () => {
      mounted = false;
    };
  }, [enabled, connect]);

  return {
    socket,
    connect,
    disconnect,
  };
}
