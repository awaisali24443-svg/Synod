import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSynodLogs, LogEntry } from '../hooks/useSynodLogs';
import { cn } from '../utils/cn';
import { Play, Pause, Trash2, Filter } from 'lucide-react';

export function Terminal() {
  const { logs, isPaused, setIsPaused, clearLogs } = useSynodLogs();
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.agent.toLowerCase().includes(filter.toLowerCase()) ||
    log.processId.toLowerCase().includes(filter.toLowerCase())
  );

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  useEffect(() => {
    if (autoScroll && parentRef.current) {
      const scrollElement = parentRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-synod-critical';
      case 'WARNING': return 'text-synod-warning';
      case 'SUCCESS': return 'text-synod-success';
      case 'DEBUG': return 'text-synod-text-muted';
      default: return 'text-synod-text-secondary';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border border-synod-border rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-synod-border bg-synod-bg-tertiary">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
          <span className="text-synod-text-secondary uppercase tracking-wider font-semibold">War Room Terminal</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-black/50 px-2 py-1 rounded border border-synod-border">
            <Filter size={14} className="text-synod-text-muted" />
            <input 
              type="text" 
              placeholder="Filter logs..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-synod-text-primary placeholder-synod-text-muted w-32 focus:w-48 transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", isPaused ? "text-synod-warning" : "text-synod-accent")}
            title={isPaused ? "Resume Stream" : "Pause Stream"}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          
          <button 
            onClick={clearLogs}
            className="p-1.5 rounded hover:bg-white/10 text-synod-text-muted hover:text-synod-critical transition-colors"
            title="Clear Logs"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 custom-scrollbar"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-synod-text-muted font-mono text-xs">
            <span className="animate-pulse">Waiting for telemetry...</span>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = filteredLogs[virtualRow.index];
              const date = new Date(log.timestamp);
              const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
              
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center space-x-3 hover:bg-white/5 px-2 rounded transition-colors"
                >
                  <span className="text-synod-text-muted shrink-0 w-24">[{timeString}]</span>
                  <span className="text-synod-accent shrink-0 w-28 truncate">{log.agent}</span>
                  <span className="text-synod-text-muted shrink-0 w-24 truncate">{log.processId}</span>
                  <span className={cn("truncate", getLevelColor(log.level))}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
