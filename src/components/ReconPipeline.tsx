import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { Search, Globe, Database, Cpu, UserCheck, FileText, ArrowRight, CheckCircle } from 'lucide-react';

const STAGES_CONFIG = [
  { id: 'recon', label: 'Recon', icon: Search },
  { id: 'crawl', label: 'Crawl', icon: Globe },
  { id: 'analysis', label: 'AI Analysis', icon: Cpu },
  { id: 'pending_auth', label: 'Human Review', icon: UserCheck },
  { id: 'payload_testing', label: 'Payload Testing', icon: Database },
  { id: 'reporting', label: 'Report', icon: FileText },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

export function ReconPipeline() {
  const [currentStatus, setCurrentStatus] = useState<string>('initialized');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/scans');
        if (res.ok) {
          const scans = await res.json();
          const activeScan = Object.values(scans).find((s: any) => s.status !== 'failed');
          if (activeScan) {
            setCurrentStatus((activeScan as any).status);
          } else {
            setCurrentStatus('initialized');
          }
        }
      } catch (e) {
        console.error("Failed to fetch scans", e);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStageStatus = (stageId: string, index: number) => {
    const currentIndex = STAGES_CONFIG.findIndex(s => s.id === currentStatus);
    if (currentStatus === 'initialized') return 'pending';
    if (stageId === currentStatus) return 'active';
    if (index < currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Recon Pipeline</h2>
      
      <div className="flex items-center justify-between w-full overflow-x-auto pb-2 custom-scrollbar">
        {STAGES_CONFIG.map((stage, index) => {
          const isLast = index === STAGES_CONFIG.length - 1;
          const status = getStageStatus(stage.id, index);
          
          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative",
                  status === 'completed' ? "bg-synod-accent/20 border-synod-accent text-synod-accent" :
                  status === 'active' ? "bg-synod-ai/20 border-synod-ai text-synod-ai shadow-[0_0_15px_rgba(0,243,255,0.3)]" :
                  "bg-black/50 border-white/10 text-gray-600"
                )}>
                  <stage.icon size={18} />
                  
                  {status === 'active' && (
                    <motion.div 
                      className="absolute inset-0 rounded-full border-2 border-synod-ai"
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-2 font-mono uppercase text-center",
                  status === 'completed' ? "text-synod-accent" :
                  status === 'active' ? "text-synod-ai font-bold" :
                  "text-gray-600"
                )}>
                  {stage.label}
                </span>
              </div>
              
              {!isLast && (
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className={cn(
                    "h-[2px] w-full max-w-[40px] rounded",
                    status === 'completed' ? "bg-synod-accent/50" : "bg-white/10"
                  )} />
                  <ArrowRight size={12} className={cn(
                    "mx-1 shrink-0",
                    status === 'completed' ? "text-synod-accent/50" : "text-white/10"
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
