import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Terminal, 
  Users, 
  CheckCircle2, 
  Sliders, 
  AlertTriangle,
  FileKey,
  Globe
} from "lucide-react";
import { SovereignConfig, SovereignUserRole } from "../../types/sovereign";
import { saveSovereignConfig, appendAuditLog } from "../../services/sovereignEngine";

interface SovereignSecurityPanelProps {
  config: SovereignConfig;
  onUpdateConfig: (newConfig: SovereignConfig) => void;
  isDark?: boolean;
}

export const SovereignSecurityPanel: React.FC<SovereignSecurityPanelProps> = ({
  config,
  onUpdateConfig,
  isDark = true
}) => {
  const [timeoutMs, setTimeoutMs] = useState(config.sandboxConfig.timeoutMs);
  const [memoryMb, setMemoryMb] = useState(config.sandboxConfig.memoryLimitMb);

  const handleRoleChange = (role: SovereignUserRole) => {
    const updated = saveSovereignConfig({ userRole: role });
    onUpdateConfig(updated);

    appendAuditLog({
      workspaceId: config.activeWorkspaceId,
      workspaceName: "Security Policies",
      actor: "Security Officer",
      role,
      action: `Assigned Active Session Role: [${role.toUpperCase()}]`,
      category: "security",
      severity: "notice",
      details: { previousRole: config.userRole, newRole: role },
      status: "success"
    });
  };

  const handleSaveSandboxPolicies = () => {
    const updated = saveSovereignConfig({
      sandboxConfig: {
        ...config.sandboxConfig,
        timeoutMs: Number(timeoutMs),
        memoryLimitMb: Number(memoryMb)
      }
    });
    onUpdateConfig(updated);

    appendAuditLog({
      workspaceId: config.activeWorkspaceId,
      workspaceName: "Security Policies",
      actor: config.userRole === "admin" ? "System Administrator" : "Organizational User",
      role: config.userRole,
      action: "Updated Sandboxing Resource Limits",
      category: "sandbox",
      severity: "info",
      details: { timeoutMs, memoryLimitMb: memoryMb },
      status: "success"
    });
  };

  return (
    <div className="space-y-6">
      {/* Air-Gap Verification Matrix */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold">Data Sovereignty & Air-Gap Compliance Matrix</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SIH 2026 AUDIT COMPLIANT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero External Telemetry</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              No confidential queries or parsed document embeddings are ever broadcast to remote cloud telemetry or public LLM APIs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Secret & Key Masking</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tamper-evident audit logs automatically redact all bearer tokens, passwords, and environment credentials.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Local Model Enforcement</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If local provider is unreachable, prompts fail closed with clear diagnostics instead of silently leaking to public APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Role-Based Access Control (RBAC)</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Select your session authorization level to test granular permissions for model switching, tool configuration, and workspace exports.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {(["admin", "user", "viewer"] as SovereignUserRole[]).map(r => {
            const isSelected = config.userRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-amber-400"
                    : isDark
                      ? "bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <div className="font-semibold text-xs capitalize flex items-center justify-between">
                  <span>{r}</span>
                  {isSelected && <span className="text-[10px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">Active</span>}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  {r === "admin" && "Full administrative permissions, tool controls, security audits"}
                  {r === "user" && "Standard prompting, document indexing, sandbox runs"}
                  {r === "viewer" && "Read-only session & audit log inspection"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sandbox Isolation Policy Config */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Code Sandbox Isolation Caps</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Execution Timeout (Milliseconds)
            </label>
            <input
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                  : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
              }`}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Memory Ceiling (MB)
            </label>
            <input
              type="number"
              value={memoryMb}
              onChange={(e) => setMemoryMb(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                  : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
              }`}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSandboxPolicies}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors cursor-pointer"
          >
            Save Security Policies
          </button>
        </div>
      </div>
    </div>
  );
};
