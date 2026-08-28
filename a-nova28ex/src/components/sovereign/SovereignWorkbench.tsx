import React, { useState } from "react";
import { 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Wrench, 
  Database, 
  ShieldAlert, 
  History, 
  Terminal, 
  Building, 
  ChevronDown, 
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Users
} from "lucide-react";
import { 
  SovereignConfig, 
  SovereignWorkspace, 
  DocumentCitation, 
  SovereignUserRole 
} from "../../types/sovereign";
import { SovereignModelTab } from "./SovereignModelTab";
import { SovereignKnowledgeBaseTab } from "./SovereignKnowledgeBaseTab";
import { SovereignToolsTab } from "./SovereignToolsTab";
import { SovereignSecurityPanel } from "./SovereignSecurityPanel";
import { SovereignAuditLogTab } from "./SovereignAuditLogTab";
import { SovereignSandboxModal } from "./SovereignSandboxModal";
import { SovereignWorkspaceModal } from "./SovereignWorkspaceModal";
import { SovereignCitationModal } from "./SovereignCitationModal";
import { getSovereignWorkspaces } from "../../services/sovereignEngine";

export type SovereignTab = 'chat' | 'models' | 'tools' | 'knowledge' | 'security' | 'audit';

interface SovereignWorkbenchProps {
  config: SovereignConfig;
  onUpdateConfig: (newConfig: SovereignConfig) => void;
  activeTab: SovereignTab;
  onSelectTab: (tab: SovereignTab) => void;
  onOpenSandboxModal: () => void;
  isDark?: boolean;
}

export const SovereignWorkbench: React.FC<SovereignWorkbenchProps> = ({
  config,
  onUpdateConfig,
  activeTab,
  onSelectTab,
  onOpenSandboxModal,
  isDark = true
}) => {
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<DocumentCitation | null>(null);

  const workspaces = getSovereignWorkspaces();
  const currentWorkspace = workspaces.find(w => w.id === config.activeWorkspaceId) || workspaces[0];

  const handleSelectWorkspace = (ws: SovereignWorkspace) => {
    onUpdateConfig({
      ...config,
      activeWorkspaceId: ws.id
    });
  };

  const navItems: { id: SovereignTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'chat', label: 'Sovereign Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'models', label: 'Model & Router', icon: <Cpu className="w-3.5 h-3.5" />, badge: config.isConnected ? 'Connected' : 'Offline' },
    { id: 'tools', label: 'Tools (6)', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Security & Air-Gap', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'audit', label: 'Audit Activity', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`border-b ${isDark ? "bg-zinc-950/90 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
      {/* Top Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Main Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-tight">Sovereign AI Workbench</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
              SIH 2026
            </span>
          </div>

          {/* Workspace Switcher */}
          <button
            type="button"
            onClick={() => setIsWorkspaceModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-colors cursor-pointer ${
              isDark 
                ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200" 
                : "bg-white border-zinc-300 hover:border-zinc-400 text-zinc-800"
            }`}
          >
            <Building className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold truncate max-w-[140px]">{currentWorkspace.name}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Connection Status Pill */}
          <button
            type="button"
            onClick={() => onSelectTab('models')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono font-medium transition-all cursor-pointer ${
              config.isConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${config.isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            <span>
              {config.isConnected
                ? `${config.provider.toUpperCase()} • ${config.selectedModel === 'auto' ? 'Auto Router' : config.selectedModel}`
                : "Local AI not connected"}
            </span>
          </button>

          {/* Sandbox Launch Button */}
          <button
            type="button"
            onClick={onOpenSandboxModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer ${
              isDark 
                ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300" 
                : "bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700"
            }`}
            title="Open isolated code runner"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>Sandbox</span>
          </button>

          {/* Role Pill */}
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            {config.userRole}
          </span>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="px-4 border-t border-zinc-800/60 overflow-x-auto">
        <div className="flex items-center gap-1 max-w-7xl mx-auto py-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-black font-semibold shadow-xs"
                    : isDark
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-black/20 text-black font-semibold"
                      : item.badge === "Connected"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace Switcher Modal */}
      <SovereignWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        activeWorkspaceId={config.activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onClose={() => setIsWorkspaceModalOpen(false)}
        isDark={isDark}
      />

      {/* Citation Preview Modal */}
      <SovereignCitationModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
        isDark={isDark}
      />
    </div>
  );
};
