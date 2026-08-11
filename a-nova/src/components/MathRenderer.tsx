import React, { useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
  isDark?: boolean;
  className?: string;
  inline?: boolean;
}

/**
 * Pre-processes text to ensure LaTeX expressions (like \frac, \sqrt, \int, \begin{...})
 * and standard math delimiters (\(...\), \[...\], $$...$$, $...$) are normalized for KaTeX.
 */
function normalizeMathDelimiters(input: string): string {
  if (!input) return "";

  let text = input;

  // Replace \[ ... \] with $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

  // Replace \( ... \) with $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // Auto-wrap standalone \begin{env} ... \end{env} blocks if not already enclosed in $$
  text = text.replace(/(?<!\$\$)\s*\\begin\{(matrix|bmatrix|pmatrix|vmatrix|Vmatrix|cases|align|equation|subarray)\}([\s\S]*?)\\end\{\1\}\s*(?!\$\$)/g, (_, env, content) => {
    return `\n$$\n\\begin{${env}}${content}\\end{${env}}\n$$\n`;
  });

  // Auto-wrap standalone \frac{...}{...}, \sqrt{...}, \int, \sum, \lim, \vec, \hat if not inside $ or $$
  // Only wrap if it's not already inside dollar signs
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  const normalizedParts = parts.map((part, idx) => {
    // Odd indices are already delimited math
    if (idx % 2 === 1) return part;

    // Check for standalone LaTeX commands like \frac{a}{b} or \sqrt{x} in plain text
    return part.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|\\int(_\{[^{}]*\}|\^[^{}]*|_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)*|\\sum(_\{[^{}]*\}|\^[^{}]*|_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)*|\\lim_\{[^{}]*\}|\\vec\{[^{}]*\}|\\pmatrix\{[^{}]*\}|\\bmatrix\{[^{}]*\})/g, (match) => {
      return `$${match}$`;
    });
  });

  return normalizedParts.join("");
}

interface MathToken {
  type: "text" | "inline-math" | "block-math";
  content: string;
}

function isLikelyMath(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 180) return false;

  // Cannot start or end with space in original string
  if (content.startsWith(" ") || content.endsWith(" ")) return false;

  // Currency or price check: if starts with a digit (e.g. $50, $10.99, $100), it is currency, not math
  if (/^\d/.test(trimmed)) return false;

  // Explicit LaTeX commands
  if (/\\(frac|sqrt|int|sum|lim|vec|hat|alpha|beta|gamma|delta|pi|theta|sigma|omega|infty|le|ge|neq|approx|times|cdot|partial|nabla|begin|end|mathbf|mathcal|mathbb|mathrm|text|left|right)/i.test(trimmed)) {
    return true;
  }

  // Math expressions with equations, operators, powers, subscripts, comparisons
  if (/[=+\-*/^_<>\\()\[\]]/.test(trimmed)) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 10) return false;
    return true;
  }

  // Single variable math like $x$, $y$, $z$, $A$, $n$
  if (/^[a-zA-Z]$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Parses a string into plain text, inline math ($...$), and block math ($$...$$) tokens.
 */
function parseMathTokens(text: string): MathToken[] {
  const normalized = normalizeMathDelimiters(text);
  const tokens: MathToken[] = [];

  // Pattern matches block math ($$...$$) or inline math ($...$)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({
        type: "text",
        content: normalized.substring(lastIdx, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith("$$") && matchedStr.endsWith("$$")) {
      tokens.push({
        type: "block-math",
        content: matchedStr.slice(2, -2).trim(),
      });
    } else if (matchedStr.startsWith("$") && matchedStr.endsWith("$")) {
      const mathInner = matchedStr.slice(1, -1);
      if (isLikelyMath(mathInner)) {
        tokens.push({
          type: "inline-math",
          content: mathInner.trim(),
        });
      } else {
        tokens.push({
          type: "text",
          content: matchedStr,
        });
      }
    } else {
      tokens.push({
        type: "text",
        content: matchedStr,
      });
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < normalized.length) {
    tokens.push({
      type: "text",
      content: normalized.substring(lastIdx),
    });
  }

  return tokens;
}

/**
 * Renders a single KaTeX expression safely into HTML string.
 */
function renderKatexToString(math: string, displayMode: boolean): { html: string; error: boolean } {
  try {
    const html = katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      errorColor: "#ef4444",
      output: "htmlAndMathml",
      strict: false,
    });
    return { html, error: false };
  } catch (err) {
    console.warn("KaTeX rendering fallback for:", math, err);
    return { html: math, error: true };
  }
}

/**
 * Component to safely render KaTeX math HTML or text fallback
 */
export const KatexSpan: React.FC<{
  math: string;
  displayMode?: boolean;
  isDark?: boolean;
}> = React.memo(({ math, displayMode = false, isDark = false }) => {
  const { html, error } = useMemo(() => renderKatexToString(math, displayMode), [math, displayMode]);

  if (error) {
    return (
      <code
        className={`px-1.5 py-0.5 rounded text-xs font-mono border ${
          isDark
            ? "bg-purple-950/40 text-purple-300 border-purple-800/60"
            : "bg-purple-50 text-purple-900 border-purple-200"
        }`}
      >
        {math}
      </code>
    );
  }

  if (displayMode) {
    return (
      <div
        className="my-1 py-0.5 px-1 overflow-x-auto text-center flex justify-center items-center font-serif text-sm sm:text-base leading-normal"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className="inline-block align-baseline mx-0.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

/**
 * MathRenderer: Parses text containing math notation and renders it inline/block.
 */
export const MathRenderer: React.FC<MathRendererProps> = React.memo(
  ({ text, isDark = false, className = "", inline = false }) => {
    const tokens = useMemo(() => parseMathTokens(text), [text]);

    if (!tokens.length) return null;

    if (inline) {
      return (
        <span className={className}>
          {tokens.map((token, idx) => {
            if (token.type === "block-math" || token.type === "inline-math") {
              return (
                <KatexSpan
                  key={idx}
                  math={token.content}
                  displayMode={token.type === "block-math"}
                  isDark={isDark}
                />
              );
            }
            return <React.Fragment key={idx}>{token.content}</React.Fragment>;
          })}
        </span>
      );
    }

    return (
      <div className={className}>
        {tokens.map((token, idx) => {
          if (token.type === "block-math") {
            return (
              <KatexSpan
                key={idx}
                math={token.content}
                displayMode={true}
                isDark={isDark}
              />
            );
          }
          if (token.type === "inline-math") {
            return (
              <KatexSpan
                key={idx}
                math={token.content}
                displayMode={false}
                isDark={isDark}
              />
            );
          }
          return <span key={idx}>{token.content}</span>;
        })}
      </div>
    );
  }
);

export default MathRenderer;
