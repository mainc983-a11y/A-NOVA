import React, { useMemo } from "react";
import { Check, Copy, Terminal, FileCode, Database, Braces } from "lucide-react";

interface CodeBlockCardProps {
  codeText: string;
  detectedLang?: string;
  copiedCodeId?: string | null;
  onCopy: (text: string) => void;
  isDark?: boolean;
}

const langConfig: Record<string, { label: string; ext: string; icon: any; color: string }> = {
  ts: { label: "TypeScript", ext: ".ts", icon: FileCode, color: "text-blue-500" },
  tsx: { label: "React TypeScript", ext: ".tsx", icon: FileCode, color: "text-sky-500" },
  js: { label: "JavaScript", ext: ".js", icon: FileCode, color: "text-yellow-500" },
  jsx: { label: "React JavaScript", ext: ".jsx", icon: FileCode, color: "text-amber-500" },
  py: { label: "Python", ext: ".py", icon: FileCode, color: "text-emerald-500" },
  python: { label: "Python", ext: ".py", icon: FileCode, color: "text-emerald-500" },
  html: { label: "HTML5", ext: ".html", icon: FileCode, color: "text-orange-500" },
  css: { label: "CSS3", ext: ".css", icon: FileCode, color: "text-blue-400" },
  json: { label: "JSON Data", ext: ".json", icon: Braces, color: "text-yellow-400" },
  sql: { label: "SQL Query", ext: ".sql", icon: Database, color: "text-cyan-400" },
  bash: { label: "Bash Script", ext: ".sh", icon: Terminal, color: "text-emerald-400" },
  sh: { label: "Shell", ext: ".sh", icon: Terminal, color: "text-emerald-400" },
  rust: { label: "Rust", ext: ".rs", icon: FileCode, color: "text-orange-600" },
  rs: { label: "Rust", ext: ".rs", icon: FileCode, color: "text-orange-600" },
  go: { label: "Golang", ext: ".go", icon: FileCode, color: "text-cyan-500" },
  cpp: { label: "C++", ext: ".cpp", icon: FileCode, color: "text-indigo-400" },
  java: { label: "Java", ext: ".java", icon: FileCode, color: "text-red-400" },
  yaml: { label: "YAML Config", ext: ".yaml", icon: Braces, color: "text-rose-400" },
  yml: { label: "YAML Config", ext: ".yml", icon: Braces, color: "text-rose-400" },
};

// Syntax Tokenizer Regex
function tokenizeLine(line: string, isDark: boolean) {
  if (!line) return "";

  const trimmed = line.trim();
  // Comment line check
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("# ") || trimmed.startsWith("#!")) {
    return <span className={isDark ? "text-zinc-500 italic" : "text-zinc-400 italic"}>{line}</span>;
  }

  // Tokenize string literals (with escapes), comments, numbers, keywords, brackets
  const tokenRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.+$|# .+$|\b\d+(?:\.\d+)?\b|\b(?:const|let|var|function|return|import|export|from|default|class|if|else|for|while|async|await|def|public|private|protected|static|interface|type|enum|select|where|insert|update|delete|from|join|group|by|order|having|limit|true|false|null|undefined|None|self|this|fn|struct|impl|trait|use|pub|mut|match|case|switch|try|catch|finally|throw|yield)\b|[{}()\[\];,])/g;

  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      parts.push(line.substring(lastIdx, match.index));
    }

    const token = match[0];
    let tokenClass = "";

    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
      tokenClass = isDark ? "text-emerald-400 font-mono" : "text-emerald-600 font-mono";
    } else if (token.startsWith("//") || token.startsWith("#")) {
      tokenClass = isDark ? "text-zinc-500 italic" : "text-zinc-400 italic";
    } else if (/^\d+(?:\.\d+)?$/.test(token)) {
      tokenClass = isDark ? "text-amber-400 font-mono" : "text-amber-600 font-mono";
    } else if (["true", "false", "null", "undefined", "None"].includes(token)) {
      tokenClass = isDark ? "text-rose-400 font-semibold" : "text-rose-600 font-semibold";
    } else if (["const", "let", "var", "function", "return", "import", "export", "from", "class", "if", "else", "for", "while", "async", "await", "def", "select", "where", "fn", "struct", "impl", "trait", "use", "pub", "mut", "match", "case", "switch", "try", "catch", "finally", "throw", "yield"].includes(token)) {
      tokenClass = isDark ? "text-purple-400 font-semibold" : "text-purple-600 font-semibold";
    } else if (["this", "self", "interface", "type", "enum"].includes(token)) {
      tokenClass = isDark ? "text-cyan-400 font-medium" : "text-cyan-600 font-medium";
    } else {
      tokenClass = isDark ? "text-zinc-300" : "text-zinc-800";
    }

    parts.push(
      <span key={match.index} className={tokenClass}>
        {token}
      </span>
    );

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < line.length) {
    parts.push(line.substring(lastIdx));
  }

  return parts;
}

export const CodeBlockCard: React.FC<CodeBlockCardProps> = React.memo(({
  codeText,
  detectedLang = "txt",
  copiedCodeId,
  onCopy,
  isDark = true,
}) => {
  const showLineNumbers = true;
  const wrapLines = false;

  const normLang = (detectedLang || "txt").toLowerCase().trim();
  const cfg = langConfig[normLang] || {
    label: normLang.toUpperCase() || "CODE",
    ext: `.${normLang || "txt"}`,
    icon: FileCode,
    color: "text-sky-400",
  };

  const LangIcon = cfg.icon;
  const isCopied = copiedCodeId === codeText;

  const lines = useMemo(() => codeText.split("\n"), [codeText]);
  const tokenizedLines = useMemo(() => lines.map((line) => tokenizeLine(line, isDark)), [lines, isDark]);
  const byteSize = useMemo(() => new Blob([codeText]).size, [codeText]);
  const sizeStr = byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

  return (
    <div className={`my-3.5 w-full rounded-2xl border transition-all duration-300 shadow-md hover:shadow-lg overflow-hidden font-mono relative group ${
      isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-zinc-100"
    }`}>

      {/* Code Card Header */}
      <div className="px-3.5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg bg-zinc-800 ${cfg.color} shrink-0`}>
            <LangIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold tracking-wider text-[11px] uppercase text-sky-400">
              {cfg.label}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {lines.length} {lines.length === 1 ? "line" : "lines"} • {sizeStr}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Copy Button */}
          <button
            type="button"
            onClick={() => onCopy(codeText)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isCopied
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Syntax Highlighted Code Viewer */}
      <div className="relative overflow-x-auto max-h-[520px] p-3 sm:p-4 text-[11.5px] sm:text-[12.5px] leading-relaxed font-mono select-text">
        <div className="flex">
          {/* Line Numbers Gutter */}
          {showLineNumbers && (
            <div className="pr-3.5 mr-3 border-r border-zinc-800/80 text-zinc-500 font-mono text-right select-none shrink-0 space-y-0.5">
              {lines.map((_, idx) => (
                <div key={idx} className="min-h-[20px] leading-5 text-[10.5px]">
                  {idx + 1}
                </div>
              ))}
            </div>
          )}

          {/* Code Lines */}
          <div className={`min-w-0 flex-1 space-y-0.5 ${wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}>
            {lines.map((line, lIdx) => (
              <div key={lIdx} className="min-h-[20px] leading-5 flex items-center">
                {tokenizedLines[lIdx] || "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

