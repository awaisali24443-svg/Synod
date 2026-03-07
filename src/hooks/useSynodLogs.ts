import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: number;
  agent: string;
  processId: string;
  message: string;
  level: 'info' | 'warning' | 'critical' | 'ai';
}

const AGENTS = ['ReconBot', 'VulnScanner', 'AI_Analyzer', 'ExploitEngine'];
const PROCESS_IDS = ['PID-1042', 'PID-2099', 'PID-3011', 'PID-4004'];
const MESSAGES = [
  'Discovered open port 443',
  'Analyzing TLS certificate',
  'Found potential SQLi vulnerability',
  'Bypassing WAF rules',
  'Extracting parameter names',
  'Executing payload',
  'Connection timeout',
  'Rate limit exceeded',
];
const LEVELS: LogEntry['level'][] = ['info', 'warning', 'critical', 'ai'];

export function useSynodLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const logsRef = useRef<LogEntry[]>([]);

  const generateMockLog = useCallback((): LogEntry => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      agent: AGENTS[Math.floor(Math.random() * AGENTS.length)],
      processId: PROCESS_IDS[Math.floor(Math.random() * PROCESS_IDS.length)],
      message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
      level: LEVELS[Math.floor(Math.random() * LEVELS.length)],
    };
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const newLog = generateMockLog();
      logsRef.current = [...logsRef.current, newLog];
      
      // Keep only last 10000 logs to prevent memory issues
      if (logsRef.current.length > 10000) {
        logsRef.current = logsRef.current.slice(-10000);
      }
      
      setLogs([...logsRef.current]);
    }, 500); // Generate a log every 500ms

    return () => clearInterval(interval);
  }, [isPaused, generateMockLog]);

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
