import React, { useState } from 'react';
import { Terminal } from './Terminal';
import { ControlPanel } from './ControlPanel';
import { ReconPipeline } from './ReconPipeline';
import { KnowledgeGraph } from './KnowledgeGraph';
import { ApiKeyVault } from './ApiKeyVault';
import { HITLPanel } from './HITLPanel';
import { Activity, Shield, Terminal as TerminalIcon, Settings, Database, Network, Menu, X } from 'lucide-react';
import { cn } from '../utils/cn';

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const navItems = [
    { icon: Activity, label: 'Dashboard' },
    { icon: TerminalIcon, label: 'Terminal' },
    { icon: Network, label: 'Graph' },
    { icon: Settings, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Terminal':
        return (
          <div className="flex-1 p-4 md:p-6 h-full">
            <Terminal />
          </div>
        );
      case 'Graph':
        return (
          <div className="flex-1 p-4 md:p-6 h-full">
            <KnowledgeGraph />
          </div>
        );
      case 'Settings':
        return (
          <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
            <ApiKeyVault />
          </div>
        );
      case 'Dashboard':
      default:
        return (
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
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-synod-bg-primary text-white overflow-hidden selection:bg-synod-accent/30">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-64 border-r border-white/5 bg-synod-bg-secondary flex flex-col transition-transform duration-300 z-50",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center">
            <Shield className="text-synod-accent shrink-0" size={24} />
            <span className="ml-3 font-bold tracking-widest text-lg">SYNOD</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveTab(item.label);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "flex items-center px-3 py-3 rounded-lg transition-all group cursor-pointer",
                activeTab === item.label 
                  ? "bg-synod-accent/10 text-synod-accent" 
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              )}
            >
              <item.icon size={20} className={cn("shrink-0", activeTab === item.label ? "text-synod-accent" : "text-gray-500 group-hover:text-gray-300")} />
              <span className="ml-3 text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
            <span className="w-2 h-2 rounded-full bg-synod-accent animate-pulse" />
            <span>v2.4.1-beta</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-synod-bg-primary/80 backdrop-blur-sm z-10">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-4 text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-sm md:text-lg font-semibold tracking-wide text-gray-200 truncate max-w-[200px] md:max-w-none">
              {activeTab === 'Dashboard' ? 'Vulnerability Intelligence' : activeTab}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-[10px] md:text-xs font-mono bg-synod-critical/10 text-synod-critical px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-synod-critical/20">
              <span className="w-2 h-2 rounded-full bg-synod-critical animate-pulse" />
              <span className="hidden sm:inline">LIVE TARGET</span>
              <span className="sm:hidden">LIVE</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        {renderContent()}
      </main>

      <HITLPanel />
    </div>
  );
}
