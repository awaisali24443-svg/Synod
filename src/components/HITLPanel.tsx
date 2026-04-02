import React, { useEffect, useState } from 'react';
import { useSynodStore } from '../store/useSynodStore';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';

export function HITLPanel() {
  const { isHitlPending, hitlActionDetails, setHitlPending } = useSynodStore();
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/scans');
        if (res.ok) {
          const scans = await res.json();
          const pendingScan = Object.values(scans).find((s: any) => s.pending_authorization);
          if (pendingScan) {
            setPendingScanId((pendingScan as any).scan_id);
            setHitlPending(true, `AI Agent proposes executing payload testing on ${(pendingScan as any).target}. This is a highly intrusive action.`);
          } else {
            setPendingScanId(null);
            setHitlPending(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch scans", e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [setHitlPending]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!pendingScanId) return;
    try {
      await fetch('/api/v1/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: pendingScanId, action })
      });
      setHitlPending(false);
      setPendingScanId(null);
    } catch (e) {
      console.error("Failed to authorize", e);
    }
  };

  return (
    <AnimatePresence>
      {isHitlPending && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 w-96 bg-synod-bg-secondary border border-synod-critical rounded-xl shadow-[0_0_30px_rgba(255,0,60,0.2)] overflow-hidden z-50"
        >
          <div className="bg-synod-critical/20 border-b border-synod-critical/30 px-4 py-3 flex items-center">
            <AlertTriangle className="text-synod-critical mr-2 animate-pulse" size={18} />
            <h3 className="text-synod-critical font-bold text-sm tracking-wider uppercase">Human-in-the-Loop Required</h3>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              {hitlActionDetails}
            </p>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => handleAction('reject')}
                className="flex-1 bg-synod-critical/10 hover:bg-synod-critical/20 text-synod-critical border border-synod-critical/50 rounded py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} className="mr-1" /> Reject
              </button>
              <button 
                onClick={() => handleAction('approve')}
                className="flex-1 bg-synod-accent/10 hover:bg-synod-accent/20 text-synod-accent border border-synod-accent/50 rounded py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
              >
                <Check size={14} className="mr-1" /> Approve
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
