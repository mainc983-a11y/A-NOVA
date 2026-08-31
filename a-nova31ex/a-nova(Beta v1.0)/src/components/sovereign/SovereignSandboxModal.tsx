import React, { useState } from "react";
import { X, Play, Terminal, CheckCircle2, AlertCircle, Shield, RefreshCw } from "lucide-react";
import { executeInSecureSandbox, SandboxExecutionResult } from "../../services/sovereignSandbox";
import { motion, AnimatePresence } from "motion/react";

interface SovereignSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

const DEFAULT_SNIPPET = `// Secure Air-Gapped Code Sandbox
// Processes isolated computational tasks without network or secret exposure
const transactions = [
  { id: "TX-101", amount: 45000, riskScore: 0.12 },
  { id: "TX-102", amount: 120000, riskScore: 0.88 },
  { id: "TX-103", amount: 15000, riskScore: 0.05 },
  { id: "TX-104", amount: 95000, riskScore: 0.76 }
];

console.log("Analyzing " + transactions.length + " transactions...");

const highRisk = transactions.filter(t => t.riskScore > 0.5);
const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);

return {
  totalTransactions: transactions.length,
  totalVolume: totalVolume,
  flaggedCount: highRisk.length,
  flaggedIds: highRisk.map(t => t.id)
};`;

export const SovereignSandboxModal: React.FC<SovereignSandboxModalProps> = ({
  isOpen,
  onClose,
  isDark = true
}) => {
  const [code, setCode] = useState(DEFAULT_SNIPPET);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SandboxExecutionResult | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    const res = await executeInSecureSandbox(code, "javascript", 3000);
    setIsRunning(false);
    setResult(res);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${
            isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDark ? "border-zinc-850 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Air-Gapped Code Sandbox Tester</h3>
                <p className="text-[11px] text-zinc-400">
                  Strictly isolated execution • Network & Secrets blocked • 3000ms max timeout
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

          {/* Editor and Output */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Script Code (JavaScript / Node AST)
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  Sandboxed Scope
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                className={`w-full p-3 rounded-xl border font-mono text-xs leading-relaxed focus:outline-hidden transition-colors ${
                  isDark
                    ? "bg-zinc-900 border-zinc-800 text-amber-300 focus:border-amber-500"
                    : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
                }`}
              />
            </div>

            {result && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Execution Output & Telemetry
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={result.status === "success" ? "text-emerald-400" : "text-rose-400"}>
                      Status: {result.status.toUpperCase()}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{result.durationMs}ms</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border font-mono text-xs whitespace-pre-wrap ${
                  result.status === "success"
                    ? isDark ? "bg-zinc-900/90 border-zinc-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : isDark ? "bg-rose-950/20 border-rose-800/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-900"
                }`}>
                  {result.output}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-between ${
            isDark ? "border-zinc-850 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50"
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Isolated Execution Validated</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCode(DEFAULT_SNIPPET)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                Reset Code
              </button>

              <button
                type="button"
                disabled={isRunning}
                onClick={handleRun}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isRunning ? "Executing..." : "Run in Sandbox"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
