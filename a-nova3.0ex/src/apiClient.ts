/**
 * Utility wrapper for standard fetch API with detailed failure logging.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  callerContext: string = "unknown"
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || "GET";

  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      console.warn(
        `[FETCH WARN] Caller: ${callerContext} | Method: ${method} | URL: ${url} | Status: ${res.status} ${res.statusText}`
      );
    }
    return res;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(
      `[FETCH ERROR] Caller: ${callerContext} | Method: ${method} | URL: ${url} | Error: ${errorMsg}`
    );
    throw err;
  }
}
