import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Terminal, 
  FileText, 
  Cpu,
  Lock,
  Filter
} from "lucide-react";
import { AuditLogEntry, AuditCategory, AuditSeverity } from "../../types/sovereign";
import { getAuditLogs } from "../../services/sovereignEngine";

interface SovereignAuditLogTabProps {
  isDark?: boolean;
}

export const SovereignAuditLogTab: React.FC<SovereignAuditLogTabProps> = ({
  isDark = true
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesCategory = filterCategory === "all" || log.category === filterCategory;
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.workspaceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sovereign_audit_trail_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const exportAsCSV = () => {
    const headers = ["Timestamp", "Workspace", "Actor", "Role", "Category", "Severity", "Action", "Status"];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.workspaceName}"`,
      `"${l.actor}"`,
      `"${l.role}"`,
      `"${l.category}"`,
      `"${l.severity}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.status}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sovereign_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case "security":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold">SECURITY</span>;
      case "warning":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">WARNING</span>;
      case "notice":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">NOTICE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Tamper-Evident Audit Trail</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Secrets Auto-Masked
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time immutable logging of all model routing choices, document chunk indexing, sandbox runs, and tool invocations.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportAsJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={exportAsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions, actors, or workspaces..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-colors ${
              isDark
                ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                : "bg-white border-zinc-300 text-zinc-900 focus:border-amber-500"
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["all", "model", "agent", "tool", "sandbox", "upload", "security"].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === cat
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : isDark
                    ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No audit log entries recorded yet for this filter.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 overflow-x-auto">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-850/30 transition-colors text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(log.severity)}
                    <span className="font-semibold text-zinc-200">{log.action}</span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      [{log.workspaceName}]
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                    <span>Actor: <strong className="text-zinc-300">{log.actor}</strong> ({log.role})</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                    </span>
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-850 inline-block mt-1">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono capitalize bg-zinc-800 text-zinc-300">
                    {log.category}
                  </span>
                  <span className={`text-[11px] font-mono font-semibold ${
                    log.status === "success" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {log.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
