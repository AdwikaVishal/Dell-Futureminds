import { useEffect, useRef } from "react";
import { subscribeWs, WebSocketEvent } from "../lib/api/taskpilot";

export function useWebSocket(onEvent: (event: WebSocketEvent) => void) {
  const savedHandler = useRef(onEvent);

  useEffect(() => {
    savedHandler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const callback = (e: WebSocketEvent) => savedHandler.current(e);
    const unsubscribe = subscribeWs(callback);
    return () => unsubscribe();
  }, []);
}
