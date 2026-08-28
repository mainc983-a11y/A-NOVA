import React, { useState } from "react";
import { X, Building, Plus, ShieldCheck, Check } from "lucide-react";
import { SovereignWorkspace, SovereignUserRole } from "../../types/sovereign";
import { getSovereignWorkspaces, saveSovereignWorkspace, saveSovereignConfig, appendAuditLog } from "../../services/sovereignEngine";
import { motion, AnimatePresence } from "motion/react";

interface SovereignWorkspaceModalProps {
  isOpen: boolean;
  activeWorkspaceId: string;
  onSelectWorkspace: (ws: SovereignWorkspace) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const SovereignWorkspaceModal: React.FC<SovereignWorkspaceModalProps> = ({
  isOpen,
  activeWorkspaceId,
  onSelectWorkspace,
  onClose,
  isDark = true
}) => {
  const [workspaces, setWorkspaces] = useState<SovereignWorkspace[]>(getSovereignWorkspaces());
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [securityLevel, setSecurityLevel] = useState<'Air-Gapped' | 'Confidential' | 'Restricted'>('Air-Gapped');

  if (!isOpen) return null;

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    const newWs: SovereignWorkspace = {
      id: "ws_" + Math.random().toString(36).substring(2, 11),
      name: newWsName.trim(),
      description: newWsDesc.trim() || "Confidential organizational domain",
      icon: "Building",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberRole: "admin",
      securityLevel
    };

    saveSovereignWorkspace(newWs);
    const updated = getSovereignWorkspaces();
    setWorkspaces(updated);
    setIsCreating(false);
    setNewWsName("");
    setNewWsDesc("");

    appendAuditLog({
      workspaceId: newWs.id,
      workspaceName: newWs.name,
      actor: "System Administrator",
      role: "admin",
      action: `Created Private Workspace: ${newWs.name}`,
      category: "workspace",
      severity: "notice",
      details: { securityLevel },
      status: "success"
    });

    onSelectWorkspace(newWs);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDark ? "border-zinc-850 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Private Sovereign Workspaces</h3>
                <p className="text-[11px] text-zinc-400">
                  Switch between isolated organizational units & confidential domains
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-600"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List or Create Form */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {!isCreating ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Available Workspaces ({workspaces.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Workspace
                  </button>
                </div>

                <div className="space-y-2">
                  {workspaces.map(ws => {
                    const isSelected = ws.id === activeWorkspaceId;
                    return (
                      <div
                        key={ws.id}
                        onClick={() => {
                          onSelectWorkspace(ws);
                          onClose();
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 text-zinc-100 ring-1 ring-amber-500/30"
                            : isDark
                              ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                              : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-zinc-100">{ws.name}</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {ws.securityLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{ws.description}</p>
                        </div>

                        {isSelected && (
                          <span className="p-1 rounded-full bg-amber-500 text-black">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Create Isolated Workspace
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. 🏢 Strategic R&D Core"
                    className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500"
                        : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Description & Mission
                  </label>
                  <input
                    type="text"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    placeholder="Brief description of data scope"
                    className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500"
                        : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Security Level
                  </label>
                  <select
                    value={securityLevel}
                    onChange={(e) => setSecurityLevel(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500"
                        : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
                    }`}
                  >
                    <option value="Air-Gapped">Air-Gapped (Highest - Complete Network Isolation)</option>
                    <option value="Confidential">Confidential (Internal Org Only)</option>
                    <option value="Restricted">Restricted (Designated Operators Only)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors cursor-pointer"
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
