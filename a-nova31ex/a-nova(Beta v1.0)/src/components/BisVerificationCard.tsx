import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck, FileSearch, Target, ClipboardCheck } from "lucide-react";
import { BisVerification } from "../types";

export function BisVerificationCard({ data, isDark }: { data: BisVerification; isDark: boolean }) {
  const regulatoryStatus = String(
    data.regulatoryStatus ?? ""
  ).trim().toLowerCase();
  console.log("[BIS CARD] regulatoryStatus:", data.regulatoryStatus);
  const isDeNotified =
    regulatoryStatus === "de-notified" ||
    regulatoryStatus === "de_notified";

  const isMandatoryQCO =
    regulatoryStatus === "mandatory" ||
    regulatoryStatus === "mandatory qco" ||
    regulatoryStatus === "mandatory_qco";

  const isVoluntary =
    regulatoryStatus === "voluntary" ||
    regulatoryStatus === "voluntary certification" ||
    regulatoryStatus === "voluntary_certification";

  const statusLabel = isMandatoryQCO
    ? "MANDATORY QCO"
    : isDeNotified
    ? "DE-NOTIFIED / VOLUNTARY BIS"
    : isVoluntary
    ? "VOLUNTARY CERTIFICATION"
  : data.regulatoryStatus || "VERIFY REQUIRED";
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessment, setAssessment] = useState<Record<string, string>>({});
  const assessmentQuestions = [
    ["legal", "Are your factory, land, FSSAI and other legal registrations ready?"],
    ["hygiene", "Does your plant meet the required hygiene and infrastructure requirements?"],
    ["processing", "Is your water treatment and automated bottling line ready?"],
    ["laboratory", "Is your in-house laboratory equipped with qualified technical staff?"],
    ["testing", "Are your water testing reports and calibration records ready?"],
    ["regulatory", "Have you checked the latest BIS standard and QCO/Gazette requirements?"],
  ];
  const answered = assessmentQuestions.filter(([key]) => assessment[key]).length;
  const assessmentScore = answered === assessmentQuestions.length
    ? Math.round(assessmentQuestions.reduce((sum, [key]) => sum + (assessment[key] === "yes" ? 100 : assessment[key] === "unsure" ? 50 : 0), 0) / assessmentQuestions.length)
    : null;
  if (!data) return null;

  const statusClass = isMandatoryQCO
     ? "text-red-400 bg-red-500/10 border-red-500/20"
     : isDeNotified
       ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
       : isVoluntary
         ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
         : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className={`mt-3 w-full max-w-2xl rounded-2xl border p-4 ${isDark ? "bg-zinc-950/70 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[11px] font-bold tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>A-NOVA VERIFIED INTELLIGENCE</div>
            <div className="text-[9px] text-zinc-500">Authoritative-source verification layer</div>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className={`rounded-xl p-3 border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Current standard</div>
          <div className={`font-mono text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{data.currentStandard || "Needs verification"}</div>
          <div className="text-[10px] text-zinc-500 mt-1">{data.title}</div>
        </div>
        <div className={`rounded-xl p-3 border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Regulatory status</div>
          <div
            className={`font-semibold text-sm ${
              isDeNotified
                ? "text-purple-400"
                : isMandatoryQCO
                  ? "text-red-400"
                  : isVoluntary
                    ? "text-blue-400"
                    : "text-amber-400"
            }`}
          >
            {isDeNotified
              ? "De-Notified / Voluntary BIS"
              : isMandatoryQCO
                ? "Mandatory QCO"
                : isVoluntary
                  ? "Voluntary Certification"
                  : "Requires latest QCO/notification check"}
          </div>
        </div>
      </div>

      {data.detectedOutdatedClaims?.length ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-[10px] leading-relaxed">
            <div className="font-semibold text-red-400">Outdated reference detected in the AI answer</div>
            <div className="text-zinc-400">{data.detectedOutdatedClaims.join(", ")} → current BIS LIMS evidence points to {data.currentStandard}.</div>
          </div>
        </div>
      ) : null}

      {typeof data.guidanceCoverage === "number" && (
        <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-[10px] font-semibold"><Target className="w-3.5 h-3.5 text-cyan-400" /> Guidance coverage</div>
            <span className="text-sm font-bold text-cyan-400">{data.guidanceCoverage}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-cyan-400 rounded-full" style={{ width: `${data.guidanceCoverage}%` }} /></div>
          {data.guidanceGaps?.length ? <div className="text-[9px] text-zinc-500 mt-2">Still worth checking: {data.guidanceGaps.join(" • ")}</div> : <div className="text-[9px] text-zinc-500 mt-2">The response covered the main compliance-information categories.</div>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[9px] text-zinc-500">
        {data.verificationMode === "live" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <FileSearch className="w-3.5 h-3.5 text-amber-400" />}
        <span>{data.verificationMode === "live" ? "Official BIS pages were checked when reachable." : "Live check unavailable; using A-NOVA's verified fallback knowledge."}</span>
      </div>

      <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
        <button type="button" onClick={() => setAssessmentOpen(v => !v)} className="w-full flex items-center justify-between text-left">
          <span className="flex items-center gap-2 text-[10px] font-semibold"><ClipboardCheck className="w-3.5 h-3.5 text-amber-400" /> Run a self-assessment</span>
          <span className="text-[9px] text-amber-400">{assessmentScore === null ? `${answered}/${assessmentQuestions.length}` : `${assessmentScore}/100`}</span>
        </button>
        {assessmentOpen && (
          <div className="mt-3 space-y-2">
            {assessmentQuestions.map(([key, question]) => (
              <div key={key} className={`rounded-lg p-2.5 border ${isDark ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-200 bg-white"}`}>
                <div className="text-[9px] leading-relaxed mb-2">{question}</div>
                <div className="flex gap-1.5">
                  {[['yes','Yes'],['unsure','Not sure'],['no','No']].map(([value,label]) => (
                    <button key={value} type="button" onClick={() => setAssessment(prev => ({ ...prev, [key]: value }))} className={`px-2 py-1 rounded-md text-[8px] border ${assessment[key] === value ? "border-cyan-400 bg-cyan-500/10 text-cyan-300" : isDark ? "border-zinc-800 text-zinc-500" : "border-zinc-200 text-zinc-500"}`}>{label}</button>
                  ))}
                </div>
              </div>
            ))}
            {assessmentScore !== null && <div className="pt-1 text-[10px] font-semibold text-cyan-400">Self-reported readiness estimate: {assessmentScore}/100</div>}
            <div className="text-[8px] text-zinc-600">This is a self-assessment aid, not an official BIS certification or legal determination.</div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/70 flex flex-wrap gap-2">
        {data.sources?.map(source => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] transition-colors ${isDark ? "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900" : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"}`}>
            {source.label}<ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
      <div className="mt-2 text-[8px] leading-relaxed text-zinc-600">{data.disclaimer}</div>
    </div>
  );
}
