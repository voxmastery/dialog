/**
 * When dialog-web is running, CLI commands proxy through the HTTP API
 * instead of opening DuckDB directly (avoids lock conflicts).
 */

const DEFAULT_PORT = 9999;

export async function isWebRunning(port: number = DEFAULT_PORT): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiGet<T>(path: string, port: number = DEFAULT_PORT): Promise<T> {
  const res = await fetch(`http://localhost:${port}${path}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, port: number = DEFAULT_PORT): Promise<T> {
  const res = await fetch(`http://localhost:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}
