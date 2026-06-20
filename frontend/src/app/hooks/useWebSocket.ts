import { useEffect, useRef, useCallback } from "react";
import { createWebSocket, WebSocketEvent } from "../api/taskpilot";

export function useWebSocket(
  onEvent: (event: WebSocketEvent) => void,
  deps: unknown[] = [],
) {
  const wsRef = useRef<WebSocket | null>(null);

  const handler = useCallback(onEvent, deps);

  useEffect(() => {
    const ws = createWebSocket(
      (event) => handler(event),
      () => { /* connected */ },
      () => { wsRef.current = null; },
    );
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [handler]);

  return wsRef;
}
