import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebRunning, apiGet, apiPost } from '../../src/cli/api-proxy.js';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(overrides: Partial<Response> = {}) {
  const response = {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    ...overrides,
  } as unknown as Response;
  vi.mocked(globalThis.fetch).mockResolvedValue(response);
  return response;
}

describe('isWebRunning', () => {
  it('returns true when fetch succeeds with ok response', async () => {
    mockFetch({ ok: true });

    const result = await isWebRunning();

    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/api/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns false when fetch throws (server not running)', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await isWebRunning();

    expect(result).toBe(false);
  });

  it('returns false when response is not ok', async () => {
    mockFetch({ ok: false, status: 503 });

    const result = await isWebRunning();

    expect(result).toBe(false);
  });
});

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    const data = { services: [{ name: 'api', port: 3000 }] };
    mockFetch({ ok: true, json: vi.fn().mockResolvedValue(data) });

    const result = await apiGet('/api/services');

    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/api/services',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(apiGet('/api/missing')).rejects.toThrow('API error: 404');
  });
});

describe('apiPost', () => {
  it('sends correct body and returns parsed JSON', async () => {
    const responseData = { success: true };
    const body = { question: 'why did it fail?', context: 'logs...' };
    mockFetch({ ok: true, json: vi.fn().mockResolvedValue(responseData) });

    const result = await apiPost('/api/ask', body);

    expect(result).toEqual(responseData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/api/ask',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(apiPost('/api/ask', { question: 'test' })).rejects.toThrow('API error: 500');
  });
});
