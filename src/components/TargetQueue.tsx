import React, { useEffect, useState } from 'react';
import { useSynodStore } from '../store/useSynodStore';
import { Database, Clock, PlayCircle, CheckCircle2, XCircle, FileText, X } from 'lucide-react';
import { cn } from '../utils/cn';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TargetRecord {
  id: number;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  report: string | null;
  created_at: string;
}

export function TargetQueue() {
  const [queue, setQueue] = useState<TargetRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/v1/queue');
        if (res.ok) {
          const data = await res.json();
          setQueue(data);
        }
      } catch (e) {
        console.error("Failed to fetch queue", e);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} className="text-synod-warning" />;
      case 'running': return <PlayCircle size={14} className="text-synod-accent animate-pulse" />;
      case 'completed': return <CheckCircle2 size={14} className="text-synod-success" />;
      case 'failed': return <XCircle size={14} className="text-synod-critical" />;
      default: return null;
    }
  };

  return (
    <div className="bg-synod-bg-secondary border border-synod-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-synod-border flex items-center justify-between bg-synod-bg-tertiary">
        <div className="flex items-center text-synod-text-primary">
          <Database size={18} className="mr-2 text-synod-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">24/7 Worker Queue</h2>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
          <span className="text-synod-accent">WORKER ACTIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-synod-text-muted font-mono text-xs">
            <Database size={32} className="mb-2 opacity-50" />
            <p>Queue is empty.</p>
            <p>Add targets via the Control Panel.</p>
          </div>
        ) : (
          queue.map((target) => (
            <div key={target.id} className="bg-synod-bg-tertiary border border-synod-border rounded-lg p-3 flex items-center justify-between group hover:border-synod-accent/30 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-black/50 rounded-md">
                  {getStatusIcon(target.status)}
                </div>
                <div>
                  <div className="text-sm font-mono text-synod-text-primary">{target.url}</div>
                  <div className="text-[10px] text-synod-text-muted mt-0.5 uppercase tracking-wider">
                    Added: {new Date(target.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={cn(
                  "text-xs font-mono uppercase px-2 py-1 rounded border",
                  target.status === 'pending' ? "text-synod-warning border-synod-warning/20 bg-synod-warning/5" :
                  target.status === 'running' ? "text-synod-accent border-synod-accent/20 bg-synod-accent/5" :
                  target.status === 'completed' ? "text-synod-success border-synod-success/20 bg-synod-success/5" :
                  "text-synod-critical border-synod-critical/20 bg-synod-critical/5"
                )}>
                  {target.status}
                </span>
                
                {target.report && (
                  <button 
                    onClick={() => setSelectedReport(target.report)}
                    className="p-1.5 text-synod-text-secondary hover:text-synod-accent hover:bg-synod-accent/10 rounded transition-colors"
                    title="View Report"
                  >
                    <FileText size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm">
          <div className="bg-synod-bg-secondary border border-synod-border rounded-xl w-full max-w-4xl max-h-full flex flex-col shadow-2xl shadow-synod-accent/10">
            <div className="flex items-center justify-between p-4 border-b border-synod-border bg-synod-bg-tertiary rounded-t-xl">
              <h3 className="text-lg font-semibold text-synod-text-primary flex items-center">
                <FileText className="mr-2 text-synod-accent" size={20} />
                Synthesized Bug Bounty Report
              </h3>
              <button 
                onClick={() => setSelectedReport(null)}
                className="text-synod-text-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#0a0a0a]">
              <div className="markdown-body max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>{selectedReport}</Markdown>
              </div>
            </div>
            <div className="p-4 border-t border-synod-border bg-synod-bg-tertiary rounded-b-xl flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-synod-accent text-black font-semibold rounded hover:bg-synod-accent-hover transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
