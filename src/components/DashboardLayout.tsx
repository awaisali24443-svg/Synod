import React from 'react';
import { Terminal } from './Terminal';
import { ControlPanel } from './ControlPanel';
import { ReconPipeline } from './ReconPipeline';
import { KnowledgeGraph } from './KnowledgeGraph';
import { ApiKeyVault } from './ApiKeyVault';
import { HITLPanel } from './HITLPanel';
import { Activity, Shield, Terminal as TerminalIcon, Settings, Database, Network } from 'lucide-react';
import { cn } from '../utils/cn';

export function DashboardLayout() {
  const navItems = [
    { icon: Activity, label: 'Dashboard', active: true },
    { icon: TerminalIcon, label: 'Terminal', active: false },
    { icon: Network, label: 'Graph', active: false },
    { icon: Database, label: 'Data', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className="flex h-screen w-full bg-synod-bg-primary text-white overflow-hidden selection:bg-synod-accent/30">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-white/5 bg-synod-bg-secondary flex flex-col transition-all duration-300 z-20">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-white/5">
          <Shield className="text-synod-accent shrink-0" size={24} />
          <span className="ml-3 font-bold tracking-widest text-lg hidden md:block">SYNOD</span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {navItems.map((item, i) => (
            <button
              key={i}
              className={cn(
                "flex items-center justify-center md:justify-start px-3 py-3 rounded-lg transition-all group cursor-pointer",
                item.active 
                  ? "bg-synod-accent/10 text-synod-accent" 
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              )}
            >
              <item.icon size={20} className={cn("shrink-0", item.active ? "text-synod-accent" : "text-gray-500 group-hover:text-gray-300")} />
              <span className="ml-3 text-sm font-medium hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5 hidden md:block">
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
            <span className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
            <span>v2.4.1-beta</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-synod-bg-primary/80 backdrop-blur-sm z-10">
          <h1 className="text-lg font-semibold tracking-wide text-gray-200">Vulnerability Intelligence System</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono bg-synod-critical/10 text-synod-critical px-3 py-1.5 rounded-full border border-synod-critical/20">
              <span className="w-2 h-2 rounded-full bg-synod-critical animate-pulse" />
              <span>LIVE TARGET</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 h-full min-h-[800px]">
            
            {/* Left Column: Control & Pipeline */}
            <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">
              <ControlPanel />
              <ApiKeyVault />
              <div className="flex-1 min-h-[300px]">
                <KnowledgeGraph />
              </div>
            </div>
            
            {/* Right Column: Terminal & Pipeline */}
            <div className="lg:col-span-8 flex flex-col gap-4 md:gap-6">
              <ReconPipeline />
              <div className="flex-1 min-h-[400px]">
                <Terminal />
              </div>
            </div>
            
          </div>
        </div>
      </main>

      <HITLPanel />
    </div>
  );
}
