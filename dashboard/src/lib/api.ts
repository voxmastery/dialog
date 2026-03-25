import type { ErrorGroup, ParsedLogEntry, ServiceInfo, HealthResponse, AiResponse, LatencyMetrics, JourneyResponse } from './types';

const BASE = '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => get<HealthResponse>('/api/health'),
  getServices: () => get<{ services: ServiceInfo[] }>('/api/services'),
  getErrors: (params?: { last?: string; service?: string; level?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{ errors: ErrorGroup[]; total: number }>(`/api/errors${qs ? `?${qs}` : ''}`);
  },
  getLogs: (params?: { last?: string; service?: string; level?: string; path?: string; grep?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString();
    return get<{ logs: ParsedLogEntry[]; total: number }>(`/api/logs${qs ? `?${qs}` : ''}`);
  },
  getJourney: (userId: string) => get<JourneyResponse>(`/api/journey/${userId}`),
  ask: (question: string) => post<AiResponse>('/api/ask', { question }),
  getLatency: (params?: { last?: string; service?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<LatencyMetrics>(`/api/metrics/latency${qs ? `?${qs}` : ''}`);
  },
  getTimeseries: (params?: { service?: string; interval?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString();
    return get<{ timeseries: Record<string, { timestamp: string; count: number }[]> }>(`/api/metrics/timeseries${qs ? `?${qs}` : ''}`);
  },
  exportData: (body: { type: string; format: string; filters?: Record<string, string> }) =>
    post<{ data: unknown; format: string }>('/api/export', body),
};
