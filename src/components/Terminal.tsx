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

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'critical': return 'text-synod-critical';
      case 'ai': return 'text-synod-ai';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-synod-bg-secondary border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
          <span className="text-gray-400 uppercase tracking-wider font-semibold">War Room Terminal</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-black/50 px-2 py-1 rounded border border-white/10">
            <Filter size={14} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Filter logs..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-300 placeholder-gray-600 w-32 focus:w-48 transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", isPaused ? "text-yellow-400" : "text-synod-accent")}
            title={isPaused ? "Resume Stream" : "Pause Stream"}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          
          <button 
            onClick={clearLogs}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-synod-critical transition-colors"
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
                <span className="text-gray-600 shrink-0">[{timeString}]</span>
                <span className="text-synod-accent shrink-0 w-24 truncate">{log.agent}</span>
                <span className="text-gray-500 shrink-0 w-20">{log.processId}</span>
                <span className={cn("truncate", getLevelColor(log.level))}>
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
