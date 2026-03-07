import React, { useState } from 'react';
import { useSynodStore } from '../store/useSynodStore';
import { Key, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export function ApiKeyVault() {
  const { apiProviders } = useSynodStore();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4">
      <div className="flex items-center mb-4 text-gray-400">
        <Key size={16} className="mr-2" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">API Key Vault</h2>
      </div>

      <div className="space-y-3">
        {apiProviders.map((provider) => (
          <div key={provider.id} className="bg-black/30 border border-white/5 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">{provider.name}</span>
              <div className="flex items-center space-x-1">
                {provider.status === 'connected' ? (
                  <>
                    <CheckCircle2 size={12} className="text-synod-accent" />
                    <span className="text-[10px] font-mono text-synod-accent uppercase">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle size={12} className="text-gray-500" />
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Disconnected</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="relative">
              <input
                type={visibleKeys[provider.id] ? "text" : "password"}
                value={provider.key}
                readOnly
                placeholder="Enter API Key..."
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-gray-400 focus:outline-none focus:border-white/20 pr-8"
              />
              <button
                onClick={() => toggleVisibility(provider.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {visibleKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
