import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  processId: string;
  message: string;
  level: 'info' | 'warning' | 'critical' | 'ai' | 'debug' | 'error';
}

export function useSynodLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const logsRef = useRef<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        if (isPaused) return;
        
        try {
          const data = JSON.parse(event.data);
          const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: data.timestamp,
            agent: data.agent,
            processId: data.processId,
            message: data.message,
            level: data.level.toLowerCase() as any,
          };
          
          logsRef.current = [...logsRef.current, newLog];
          
          if (logsRef.current.length > 10000) {
            logsRef.current = logsRef.current.slice(-10000);
          }
          
          setLogs([...logsRef.current]);
        } catch (e) {
          console.error("Failed to parse log message", e);
        }
      };

      ws.onclose = () => {
        setTimeout(connect, 2000); // Reconnect
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isPaused]);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  return {
    logs,
    isPaused,
    setIsPaused,
    clearLogs,
  };
}
