/**
 * Utility wrapper for standard fetch API with automatic retries and resilient network handling.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  callerContext: string = "unknown"
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || "GET";

  let attempts = 0;
  const maxAttempts = 3;
  let delayMs = 250;

  while (attempts < maxAttempts) {
    attempts++;
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

      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }

      console.warn(
        `[FETCH NETWORK WARNING] Caller: ${callerContext} | Method: ${method} | URL: ${url} | Connection offline/busy: ${errorMsg}`
      );

      // Return synthetic 503 response instead of throwing "Failed to fetch"
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable. Please try again.",
          callerContext,
          details: errorMsg
        }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Service unavailable." }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

