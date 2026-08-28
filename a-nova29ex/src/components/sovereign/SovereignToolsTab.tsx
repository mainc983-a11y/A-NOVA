import React from "react";
import { 
  Wrench, 
  FileText, 
  Binary, 
  BarChart3, 
  Database, 
  ShieldAlert, 
  Terminal, 
  Check, 
  Lock,
  Sparkles
} from "lucide-react";
import { SovereignConfig, SovereignTool } from "../../types/sovereign";
import { SOVEREIGN_TOOLS, saveSovereignConfig, appendAuditLog } from "../../services/sovereignEngine";

interface SovereignToolsTabProps {
  config: SovereignConfig;
  onUpdateConfig: (newConfig: SovereignConfig) => void;
  isDark?: boolean;
}

export const SovereignToolsTab: React.FC<SovereignToolsTabProps> = ({
  config,
  onUpdateConfig,
  isDark = true
}) => {
  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case "document_analyzer": return <FileText className="w-5 h-5 text-blue-400" />;
      case "calculator": return <Binary className="w-5 h-5 text-emerald-400" />;
      case "data_analysis": return <BarChart3 className="w-5 h-5 text-purple-400" />;
      case "knowledge_rag": return <Database className="w-5 h-5 text-amber-400" />;
      case "report_generator": return <ShieldAlert className="w-5 h-5 text-indigo-400" />;
      case "code_sandbox": return <Terminal className="w-5 h-5 text-rose-400" />;
      default: return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleToggleTool = (toolId: string) => {
    if (config.userRole === "viewer") return;

    const currentPerms = { ...config.toolPermissions };
    const newVal = !currentPerms[toolId];
    currentPerms[toolId] = newVal;

    const updated = saveSovereignConfig({ toolPermissions: currentPerms });
    onUpdateConfig(updated);

    appendAuditLog({
      workspaceId: config.activeWorkspaceId,
      workspaceName: "Active Workspace",
      actor: config.userRole === "admin" ? "System Administrator" : "Organizational User",
      role: config.userRole,
      action: `${newVal ? "Enabled" : "Disabled"} Tool: [${toolId}]`,
      category: "tool",
      severity: "notice",
      details: { toolId, enabled: newVal },
      status: "success"
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Autonomous Tool Execution Policies</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              Role: {config.userRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure which on-premise execution modules the Autonomous Agent is permitted to invoke during multi-step problem solving.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOVEREIGN_TOOLS.map(tool => {
          const isEnabled = !!config.toolPermissions[tool.id];
          const isLocked = config.userRole === "viewer";

          return (
            <div
              key={tool.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isEnabled
                  ? isDark ? "bg-zinc-900/80 border-zinc-750 shadow-xs" : "bg-white border-zinc-300 shadow-xs"
                  : isDark ? "bg-zinc-950/40 border-zinc-850 opacity-60" : "bg-zinc-100/60 border-zinc-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                      {getToolIcon(tool.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                        {tool.name}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400 capitalize">
                        Category: {tool.category}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggleTool(tool.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 ${
                      isEnabled ? "bg-amber-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Required Role: {tool.requiredRole}</span>
                <span className={isEnabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                  {isEnabled ? "ACTIVE IN PLANNER" : "DISABLED"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
