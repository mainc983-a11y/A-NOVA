import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  FileText, 
  Binary, 
  BarChart3, 
  Database, 
  ShieldAlert,
  Zap,
  Layers,
  Sparkles
} from "lucide-react";
import { AgentExecutionPlan, AgentTaskStep, DocumentCitation } from "../../types/sovereign";

interface SovereignAgentPlannerViewProps {
  plan: AgentExecutionPlan;
  onOpenCitation?: (citation: DocumentCitation) => void;
  isDark?: boolean;
}

export const SovereignAgentPlannerView: React.FC<SovereignAgentPlannerViewProps> = ({
  plan,
  onOpenCitation,
  isDark = true
}) => {
  const [expanded, setExpanded] = useState(true);

  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case "document_analyzer": return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case "calculator": return <Binary className="w-3.5 h-3.5 text-emerald-400" />;
      case "data_analysis": return <BarChart3 className="w-3.5 h-3.5 text-purple-400" />;
      case "knowledge_rag": return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case "report_generator": return <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />;
      case "code_sandbox": return <Terminal className="w-3.5 h-3.5 text-rose-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getStepStatusIcon = (status: AgentTaskStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case "skipped":
        return <Clock className="w-4 h-4 text-zinc-500 shrink-0" />;
      default:
        return <div className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />;
    }
  };

  return (
    <div className={`my-3 rounded-2xl border transition-all overflow-hidden ${
      isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
    }`}>
      {/* Planner Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className={`px-4 py-3 flex items-center justify-between cursor-pointer select-none ${
          isDark ? "hover:bg-zinc-850/60" : "hover:bg-zinc-100"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">
                Autonomous Agent Execution Plan
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-amber-400 border border-zinc-700">
                {plan.routedModel}
              </span>
            </div>
            {plan.routingReason && (
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                {plan.routingReason}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {plan.totalDurationMs > 0 && (
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {plan.totalDurationMs}ms
            </span>
          )}
          <button className="text-zinc-400 hover:text-zinc-200 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Steps List */}
      {expanded && (
        <div className={`px-4 pb-4 pt-1 space-y-2 border-t ${
          isDark ? "border-zinc-850" : "border-zinc-200"
        }`}>
          {plan.steps.map((step, idx) => (
            <div
              key={step.id || `step_${idx}`}
              className={`p-2.5 rounded-xl border flex items-start gap-3 transition-colors ${
                step.status === "running"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : step.status === "completed"
                    ? isDark ? "bg-zinc-950/40 border-zinc-800/80" : "bg-white border-zinc-200"
                    : isDark ? "bg-zinc-950/20 border-zinc-850" : "bg-zinc-100/50 border-zinc-200"
              }`}
            >
              <div className="mt-0.5">
                {getStepStatusIcon(step.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {step.title}
                    </span>
                    {step.toolUsed && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                        {getToolIcon(step.toolUsed)}
                        {step.toolUsed}
                      </span>
                    )}
                  </div>
                  {step.durationMs ? (
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {step.durationMs}ms
                    </span>
                  ) : null}
                </div>

                {step.outputSummary && (
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {step.outputSummary}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Citations Badges */}
          {plan.citations && plan.citations.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                Retrieved Citations ({plan.citations.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {plan.citations.map((c, cIdx) => (
                  <button
                    key={`cit_${cIdx}`}
                    type="button"
                    onClick={() => onOpenCitation && onOpenCitation(c)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>{c.documentName}</span>
                    {c.pageNumber && <span className="opacity-70 font-mono">p.{c.pageNumber}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
