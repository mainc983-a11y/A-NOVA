import React, { useState } from "react";
import { 
  Server, 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Zap, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers
} from "lucide-react";
import { SovereignConfig, SovereignProvider, SovereignModel } from "../../types/sovereign";
import { testLocalProviderConnection, saveSovereignConfig } from "../../services/sovereignEngine";

interface SovereignModelTabProps {
  config: SovereignConfig;
  onUpdateConfig: (newConfig: SovereignConfig) => void;
  isDark?: boolean;
}

export const SovereignModelTab: React.FC<SovereignModelTabProps> = ({
  config,
  onUpdateConfig,
  isDark = true
}) => {
  const [provider, setProvider] = useState<SovereignProvider>(config.provider);
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl);
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const providerPresets: { id: SovereignProvider; name: string; defaultUrl: string; desc: string }[] = [
    { id: "ollama", name: "Ollama", defaultUrl: "http://localhost:11434", desc: "Native on-premise runner for Llama 3.3, DeepSeek-R1, Mistral" },
    { id: "vllm", name: "vLLM", defaultUrl: "http://localhost:8000/v1", desc: "High-throughput GPU server with PagedAttention" },
    { id: "lmstudio", name: "LM Studio", defaultUrl: "http://localhost:1234/v1", desc: "Local cross-platform desktop inference engine" },
    { id: "local_endpoint", name: "OpenAI-Compatible Local Endpoint", defaultUrl: "http://localhost:8080/v1", desc: "Generic local endpoint (LocalAI, text-generation-webui, TGI)" }
  ];

  const handleProviderSelect = (p: SovereignProvider) => {
    setProvider(p);
    const preset = providerPresets.find(pr => pr.id === p);
    if (preset && (!endpointUrl || endpointUrl.includes("localhost"))) {
      setEndpointUrl(preset.defaultUrl);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testLocalProviderConnection(provider, endpointUrl, apiKey);
    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.message,
      latency: res.latencyMs
    });

    if (res.success) {
      const updated = saveSovereignConfig({
        provider,
        endpointUrl,
        apiKey: apiKey || undefined,
        isConnected: true,
        detectedModels: res.models,
        lastCheckedAt: new Date().toISOString()
      });
      onUpdateConfig(updated);
    } else {
      const updated = saveSovereignConfig({
        provider,
        endpointUrl,
        isConnected: false,
        lastCheckedAt: new Date().toISOString()
      });
      onUpdateConfig(updated);
    }
  };

  const handleSelectModel = (modelId: string) => {
    const updated = saveSovereignConfig({ selectedModel: modelId });
    onUpdateConfig(updated);
  };

  const handleToggleAutoRouting = () => {
    const updated = saveSovereignConfig({ autoRoutingEnabled: !config.autoRoutingEnabled });
    onUpdateConfig(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
        config.isConnected
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
      }`}>
        {config.isConnected ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-semibold text-sm">
            {config.isConnected ? "🟢 Local AI Engine Active" : "🔴 Local AI Not Connected"}
          </div>
          <p className="mt-0.5 text-zinc-300">
            {config.isConnected
              ? `Connected to ${config.provider.toUpperCase()} at ${config.endpointUrl}. All confidential prompts & document data are processed on-premise with zero external network leakage.`
              : "To ensure 100% data sovereignty, A-Nova strictly avoids falling back to external cloud APIs in Sovereign Mode. Connect a local inference server below to proceed."}
          </p>
        </div>
      </div>

      {/* Connection Config Card */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Local Inference Provider</h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Air-Gap Ready</span>
        </div>

        {/* Provider Radio Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {providerPresets.map(preset => {
            const isSelected = provider === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleProviderSelect(preset.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-xs"
                    : isDark
                      ? "bg-zinc-800/50 border-zinc-750 text-zinc-300 hover:bg-zinc-800"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <div className="font-semibold text-xs">{preset.name}</div>
                <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{preset.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Endpoint Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Local Endpoint URL
            </label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                  : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
              }`}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Optional Local Token / Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Bearer token (if required)"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                  : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-amber-500"
              }`}
            />
          </div>
        </div>

        {/* Action Button & Test Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
              {isTesting ? "Testing Local Ping..." : "Test Connection & Discover Models"}
            </button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              testResult.success ? "text-emerald-400" : "text-rose-400"
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testResult.message}</span>
              {testResult.latency && (
                <span className="font-mono text-[11px] opacity-80">({testResult.latency}ms)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Model Router & Auto Routing Card */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Model Selector & Task Router</h3>
          </div>

          {/* Auto Routing Toggle */}
          <button
            type="button"
            onClick={handleToggleAutoRouting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              config.autoRoutingEnabled
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : isDark
                  ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                  : "bg-zinc-100 border-zinc-300 text-zinc-600"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto Task Routing: <strong>{config.autoRoutingEnabled ? "ON" : "OFF"}</strong></span>
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Select a default model or let <strong>Auto Mode</strong> inspect each prompt intent to dynamically dispatch to reasoning, coding, vision, or general open weights.
        </p>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {config.detectedModels.map(model => {
            const isSelected = config.selectedModel === model.id;
            return (
              <div
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500 text-zinc-100 ring-1 ring-amber-500/40"
                    : isDark
                      ? "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      {model.name}
                      {model.id === "auto" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-400 font-mono">
                          Smart
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="p-0.5 rounded-full bg-amber-500 text-black">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {model.size && (
                    <div className="text-[11px] font-mono text-zinc-500 mt-1">
                      {model.size} {model.contextWindow ? `• ${(model.contextWindow / 1024).toFixed(0)}k ctx` : ""}
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2">
                    {model.recommendedFor}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {model.capabilities.map(cap => (
                    <span
                      key={cap}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono capitalize bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
