import React, { useState } from 'react';
import { useSynodStore, ScanMode } from '../store/useSynodStore';
import { Play, Terminal as TerminalIcon, ShieldAlert, Crosshair, Search } from 'lucide-react';
import { cn } from '../utils/cn';

export function ControlPanel() {
  const { activeTargetDomain, setActiveTargetDomain, scanMode, setScanMode, addCommandToHistory, apiProviders } = useSynodStore();
  const [command, setCommand] = useState('');

  const modes: { id: ScanMode; icon: React.ElementType; label: string }[] = [
    { id: 'Passive Recon', icon: Search, label: 'Passive Recon' },
    { id: 'Discovery', icon: Crosshair, label: 'Discovery' },
    { id: 'Exploit Simulation', icon: ShieldAlert, label: 'Exploit Sim' },
  ];

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = command.trim() || activeTargetDomain.trim();
    if (!target) return;
    
    addCommandToHistory(command || `scan ${target}`);
    
    const api_keys = apiProviders.reduce((acc, provider) => {
      if (provider.key) acc[provider.id] = provider.key;
      return acc;
    }, {} as Record<string, string>);

    try {
      const res = await fetch('/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, api_keys })
      });
      if (!res.ok) {
        console.error("Failed to start scan");
      }
    } catch (err) {
      console.error("Error starting scan", err);
    }

    setCommand('');
  };

  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-synod-text-secondary">Control Panel</h2>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
          <span className="text-xs font-mono text-synod-accent">SYSTEM ONLINE</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-synod-text-muted mb-1 font-mono">TARGET DOMAIN</label>
          <input 
            type="text" 
            value={activeTargetDomain}
            onChange={(e) => setActiveTargetDomain(e.target.value)}
            className="w-full bg-synod-bg-tertiary border border-synod-border rounded px-3 py-2 text-sm font-mono text-synod-accent focus:outline-none focus:border-synod-accent/50 transition-colors"
            placeholder="example.com"
          />
        </div>

        <div>
          <label className="block text-xs text-synod-text-muted mb-1 font-mono">OPERATION MODE</label>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setScanMode(mode.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded border transition-all",
                  scanMode === mode.id 
                    ? "bg-synod-accent/10 border-synod-accent text-synod-accent" 
                    : "bg-synod-bg-tertiary border-synod-border text-synod-text-muted hover:bg-white/5 hover:text-synod-text-secondary"
                )}
              >
                <mode.icon size={18} className="mb-1" />
                <span className="text-[10px] uppercase font-semibold text-center leading-tight">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleExecute} className="pt-2">
          <label className="block text-xs text-synod-text-muted mb-1 font-mono">MANUAL OVERRIDE</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <TerminalIcon size={14} className="text-synod-text-muted" />
            </div>
            <input 
              type="text" 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full bg-synod-bg-tertiary border border-synod-border rounded pl-9 pr-10 py-2 text-sm font-mono text-white focus:outline-none focus:border-synod-accent/50 transition-colors"
              placeholder="Enter command..."
            />
            <button 
              type="submit"
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-synod-accent hover:text-white transition-colors"
            >
              <Play size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
