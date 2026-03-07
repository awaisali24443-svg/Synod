import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { Search, Globe, Database, Cpu, UserCheck, FileText, ArrowRight } from 'lucide-react';

const STAGES = [
  { id: 'recon', label: 'Recon', icon: Search, status: 'completed' },
  { id: 'crawl', label: 'Crawl', icon: Globe, status: 'completed' },
  { id: 'mining', label: 'Parameter Mining', icon: Database, status: 'active' },
  { id: 'ai', label: 'AI Analysis', icon: Cpu, status: 'pending' },
  { id: 'human', label: 'Human Review', icon: UserCheck, status: 'pending' },
  { id: 'report', label: 'Report', icon: FileText, status: 'pending' },
];

export function ReconPipeline() {
  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Recon Pipeline</h2>
      
      <div className="flex items-center justify-between w-full overflow-x-auto pb-2 custom-scrollbar">
        {STAGES.map((stage, index) => {
          const isLast = index === STAGES.length - 1;
          
          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative",
                  stage.status === 'completed' ? "bg-synod-accent/20 border-synod-accent text-synod-accent" :
                  stage.status === 'active' ? "bg-synod-ai/20 border-synod-ai text-synod-ai shadow-[0_0_15px_rgba(0,243,255,0.3)]" :
                  "bg-black/50 border-white/10 text-gray-600"
                )}>
                  <stage.icon size={18} />
                  
                  {stage.status === 'active' && (
                    <motion.div 
                      className="absolute inset-0 rounded-full border-2 border-synod-ai"
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-2 font-mono uppercase text-center",
                  stage.status === 'completed' ? "text-synod-accent" :
                  stage.status === 'active' ? "text-synod-ai font-bold" :
                  "text-gray-600"
                )}>
                  {stage.label}
                </span>
              </div>
              
              {!isLast && (
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className={cn(
                    "h-[2px] w-full max-w-[40px] rounded",
                    stage.status === 'completed' ? "bg-synod-accent/50" : "bg-white/10"
                  )} />
                  <ArrowRight size={12} className={cn(
                    "mx-1 shrink-0",
                    stage.status === 'completed' ? "text-synod-accent/50" : "text-white/10"
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
