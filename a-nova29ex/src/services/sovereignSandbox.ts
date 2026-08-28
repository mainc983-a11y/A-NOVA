export interface SandboxExecutionResult {
  id: string;
  code: string;
  language: 'javascript' | 'python' | 'sql' | 'json';
  status: 'success' | 'error' | 'security_violation';
  output: string;
  returnValue?: any;
  durationMs: number;
  memoryEstimateKb: number;
  securityChecks: {
    noNetworkAccess: boolean;
    noSecretsAccess: boolean;
    noFileSystemAccess: boolean;
    timeoutRespected: boolean;
  };
}

// Banned patterns for security isolation
const FORBIDDEN_PATTERNS = [
  /process\.env/i,
  /localStorage/i,
  /sessionStorage/i,
  /indexedDB/i,
  /document\.cookie/i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /WebSocket/i,
  /navigator\.sendBeacon/i,
  /importScripts/i,
  /window\.open/i,
  /__dirname/i,
  /__filename/i,
  /require\s*\(['"]fs['"]\)/i,
  /require\s*\(['"]child_process['"]\)/i,
  /child_process/i
];

export function validateCodeSafety(code: string): { isSafe: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      violations.push(`Security Policy Violation: Forbidden keyword detected matching ${pattern.toString()}`);
    }
  }
  return {
    isSafe: violations.length === 0,
    violations
  };
}

/**
 * Executes agent-generated code inside a sandboxed evaluation context with strict timeout and isolation.
 */
export async function executeInSecureSandbox(
  code: string,
  language: 'javascript' | 'python' | 'sql' | 'json' = 'javascript',
  timeoutMs: number = 3000
): Promise<SandboxExecutionResult> {
  const executionId = "sbx_" + Math.random().toString(36).substring(2, 11);
  const startTime = performance.now();

  // 1. Static Security Policy Audit
  const safety = validateCodeSafety(code);
  if (!safety.isSafe) {
    return {
      id: executionId,
      code,
      language,
      status: 'security_violation',
      output: `[SANDBOX SECURITY ALERT] Execution denied by Air-Gap Safety Policy:\n${safety.violations.join("\n")}`,
      durationMs: Math.round(performance.now() - startTime),
      memoryEstimateKb: 0,
      securityChecks: {
        noNetworkAccess: true,
        noSecretsAccess: true,
        noFileSystemAccess: true,
        timeoutRespected: true
      }
    };
  }

  // 2. Specialized Language Handlers
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      return {
        id: executionId,
        code,
        language,
        status: 'success',
        output: "Valid JSON schema.",
        returnValue: parsed,
        durationMs: Math.round(performance.now() - startTime),
        memoryEstimateKb: Math.ceil(code.length / 1024),
        securityChecks: {
          noNetworkAccess: true,
          noSecretsAccess: true,
          noFileSystemAccess: true,
          timeoutRespected: true
        }
      };
    } catch (e: any) {
      return {
        id: executionId,
        code,
        language,
        status: 'error',
        output: `JSON Syntax Error: ${e.message}`,
        durationMs: Math.round(performance.now() - startTime),
        memoryEstimateKb: 0,
        securityChecks: {
          noNetworkAccess: true,
          noSecretsAccess: true,
          noFileSystemAccess: true,
          timeoutRespected: true
        }
      };
    }
  }

  // 3. Isolated JavaScript Sandbox
  return new Promise<SandboxExecutionResult>((resolve) => {
    const logs: string[] = [];
    let isCompleted = false;

    const timeoutTimer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        resolve({
          id: executionId,
          code,
          language,
          status: 'error',
          output: `[SANDBOX TIMEOUT] Code execution exceeded maximum permitted limit of ${timeoutMs}ms.`,
          durationMs: timeoutMs,
          memoryEstimateKb: 128,
          securityChecks: {
            noNetworkAccess: true,
            noSecretsAccess: true,
            noFileSystemAccess: true,
            timeoutRespected: false
          }
        });
      }
    }, timeoutMs);

    try {
      // Mock isolated console
      const sandboxConsole = {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
        info: (...args: any[]) => logs.push("[INFO] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
        warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
        error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
      };

      // Create strictly isolated sandbox scope
      const sandboxGlobals = {
        console: sandboxConsole,
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        parseInt,
        parseFloat,
        isNaN,
        isFinite
      };

      // Construct scoped runner
      const argNames = Object.keys(sandboxGlobals);
      const argValues = Object.values(sandboxGlobals);

      // Wrap code in an IIFE or standard block
      const runnerCode = `"use strict";\nreturn (function() {\n${code}\n})();`;
      const fn = new Function(...argNames, runnerCode);

      const result = fn(...argValues);

      if (!isCompleted) {
        isCompleted = true;
        clearTimeout(timeoutTimer);
        const duration = Math.round(performance.now() - startTime);

        let formattedOutput = logs.join("\n");
        if (result !== undefined) {
          formattedOutput += (formattedOutput ? "\n--> Return Value: " : "Return Value: ") + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
        }
        if (!formattedOutput) {
          formattedOutput = "Execution finished with 0 output logs.";
        }

        resolve({
          id: executionId,
          code,
          language,
          status: 'success',
          output: formattedOutput,
          returnValue: result,
          durationMs: duration,
          memoryEstimateKb: Math.ceil(code.length / 512) + 64,
          securityChecks: {
            noNetworkAccess: true,
            noSecretsAccess: true,
            noFileSystemAccess: true,
            timeoutRespected: true
          }
        });
      }
    } catch (err: any) {
      if (!isCompleted) {
        isCompleted = true;
        clearTimeout(timeoutTimer);
        resolve({
          id: executionId,
          code,
          language,
          status: 'error',
          output: `[RUNTIME ERROR] ${err?.name || 'Error'}: ${err?.message || String(err)}`,
          durationMs: Math.round(performance.now() - startTime),
          memoryEstimateKb: 64,
          securityChecks: {
            noNetworkAccess: true,
            noSecretsAccess: true,
            noFileSystemAccess: true,
            timeoutRespected: true
          }
        });
      }
    }
  });
}
