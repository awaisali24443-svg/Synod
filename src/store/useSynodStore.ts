import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScanMode = 'Passive Recon' | 'Discovery' | 'Exploit Simulation';

export interface AgentProcess {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
}

export interface ApiProvider {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  key: string;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: number;
}

interface SynodState {
  apiProviders: ApiProvider[];
  activeTargetDomain: string;
  runningProcesses: AgentProcess[];
  commandHistory: CommandHistoryEntry[];
  scanMode: ScanMode;
  isHitlPending: boolean;
  hitlActionDetails: string | null;

  setApiProviders: (providers: ApiProvider[]) => void;
  setActiveTargetDomain: (domain: string) => void;
  setRunningProcesses: (processes: AgentProcess[]) => void;
  addCommandToHistory: (command: string) => void;
  setScanMode: (mode: ScanMode) => void;
  setHitlPending: (pending: boolean, details?: string | null) => void;
}

export const useSynodStore = create<SynodState>()(
  persist(
    (set) => ({
      apiProviders: [
        { id: 'gemini', name: 'Google Gemini', status: 'disconnected', key: '' },
        { id: 'deepseek', name: 'DeepSeek (R1/V3)', status: 'disconnected', key: '' },
        { id: 'huggingface', name: 'Hugging Face (Open Source)', status: 'disconnected', key: '' },
        { id: 'anthropic', name: 'Anthropic (Claude)', status: 'disconnected', key: '' },
      ],
      activeTargetDomain: '',
      runningProcesses: [],
      commandHistory: [],
      scanMode: 'Passive Recon',
      isHitlPending: false,
      hitlActionDetails: null,

      setApiProviders: (providers) => set({ apiProviders: providers }),
      setActiveTargetDomain: (domain) => set({ activeTargetDomain: domain }),
      setRunningProcesses: (processes) => set({ runningProcesses: processes }),
      addCommandToHistory: (command) => set((state) => ({ 
        commandHistory: [...state.commandHistory, { id: Math.random().toString(36).substr(2, 9), command, timestamp: Date.now() }] 
      })),
      setScanMode: (mode) => set({ scanMode: mode }),
      setHitlPending: (pending, details = null) => set({ isHitlPending: pending, hitlActionDetails: details }),
    }),
    {
      name: 'synod-storage',
      partialize: (state) => ({ 
        apiProviders: state.apiProviders, 
        activeTargetDomain: state.activeTargetDomain 
      }),
    }
  )
);
