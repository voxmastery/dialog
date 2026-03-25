import type { ParsedLogEntry } from './types';

export type WsMessage =
  | { type: 'connected'; message: string; services: { port: number; framework: string }[] }
  | { type: 'log'; data: ParsedLogEntry };

export function createLogStream(onMessage: (msg: WsMessage) => void, onStatus?: (connected: boolean) => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/api/logs/live`;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let stopped = false;

  function connect() {
    if (stopped) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      onStatus?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        onMessage(msg);
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      onStatus?.(false);
      if (!stopped) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        attempt++;
        reconnectTimer = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return {
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
