import { useEffect, useRef, useState, useCallback } from 'react';
import { createLogStream, type WsMessage } from '@/lib/ws';
import type { ParsedLogEntry } from '@/lib/types';

const MAX_LOGS = 1000;

export function useLiveLogs() {
  const [logs, setLogs] = useState<ParsedLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const streamRef = useRef<ReturnType<typeof createLogStream> | null>(null);

  useEffect(() => {
    streamRef.current = createLogStream(
      (msg: WsMessage) => {
        if (msg.type === 'log') {
          setLogs(prev => {
            const next = [msg.data, ...prev];
            return next.length > MAX_LOGS ? next.slice(0, MAX_LOGS) : next;
          });
        }
      },
      setConnected
    );

    return () => { streamRef.current?.stop(); };
  }, []);

  const clear = useCallback(() => setLogs([]), []);

  return { logs, connected, clear };
}
