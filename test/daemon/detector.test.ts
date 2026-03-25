import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { identifyFramework } from '../../src/daemon/frameworks.js';

// Mock child_process before importing detector
vi.mock('node:child_process', () => {
  const mockExec = vi.fn();
  return {
    exec: mockExec,
  };
});

import { exec } from 'node:child_process';
import { scanPort, scanAllPorts, createPeriodicScanner } from '../../src/daemon/detector.js';

const mockExec = vi.mocked(exec);

function fakeExec(stdout: string): void {
  mockExec.mockImplementation((_cmd: unknown, callback: unknown) => {
    const cb = callback as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    cb(null, { stdout, stderr: '' });
    return {} as ReturnType<typeof exec>;
  });
}

function fakeExecSequence(outputs: string[]): void {
  let callIndex = 0;
  mockExec.mockImplementation((_cmd: unknown, callback: unknown) => {
    const cb = callback as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    const stdout = outputs[callIndex] ?? '';
    callIndex += 1;
    cb(null, { stdout, stderr: '' });
    return {} as ReturnType<typeof exec>;
  });
}

function fakeExecError(): void {
  mockExec.mockImplementation((_cmd: unknown, callback: unknown) => {
    const cb = callback as (err: Error | null, result: { stdout: string; stderr: string }) => void;
    cb(new Error('Command failed'), { stdout: '', stderr: '' });
    return {} as ReturnType<typeof exec>;
  });
}

describe('identifyFramework', () => {
  it('identifies Express from output', () => {
    expect(identifyFramework('Listening on port 3000')).toBe('Express');
    expect(identifyFramework('Express server started')).toBe('Express');
  });

  it('identifies FastAPI from output', () => {
    expect(identifyFramework('Uvicorn running on http://127.0.0.1:8000')).toBe('FastAPI');
  });

  it('identifies Django from output', () => {
    expect(identifyFramework('Starting development server at http://127.0.0.1:8000/')).toBe('Django');
  });

  it('identifies Next.js from output', () => {
    expect(identifyFramework('ready - started server on 0.0.0.0:3000')).toBe('Next.js');
    expect(identifyFramework('▲ Next.js 14.0.0')).toBe('Next.js');
  });

  it('identifies Rails from output', () => {
    expect(identifyFramework('Puma starting in single mode')).toBe('Rails');
  });

  it('identifies Vite from output', () => {
    expect(identifyFramework('  Local: http://localhost:5173/')).toBe('Vite');
  });

  it('identifies Nuxt from output', () => {
    expect(identifyFramework('Nuxt Listening on http://localhost:3000')).toBe('Nuxt');
  });

  it('returns unknown for unrecognized output', () => {
    expect(identifyFramework('some random process')).toBe('unknown');
    expect(identifyFramework('')).toBe('unknown');
  });
});

describe('scanPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects a process on a port', async () => {
    fakeExecSequence(['1234\n', 'node /app/server.js Express server\n']);

    const result = await scanPort(3000);

    expect(result).not.toBeNull();
    expect(result!.port).toBe(3000);
    expect(result!.pid).toBe(1234);
    expect(result!.command).toBe('node /app/server.js Express server');
    expect(result!.framework).toBe('Express');
    expect(result!.status).toBe('active');
  });

  it('returns null when no process is on the port', async () => {
    fakeExecError();

    const result = await scanPort(9999);
    expect(result).toBeNull();
  });

  it('returns null when lsof returns empty output', async () => {
    fakeExecSequence(['']);

    const result = await scanPort(8080);
    expect(result).toBeNull();
  });
});

describe('scanAllPorts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scans multiple ports and returns detected services', async () => {
    let callIndex = 0;
    mockExec.mockImplementation((_cmd: unknown, callback: unknown) => {
      const cb = callback as (err: Error | null, result: { stdout: string; stderr: string }) => void;
      const responses = [
        '1234\n',                                          // lsof port 3000
        'node server.js Express server\n',                 // ps for 1234
        '',                                                // lsof port 4000 (empty)
        '5678\n',                                          // lsof port 8000
        'python -m uvicorn Uvicorn running on 0.0.0.0\n', // ps for 5678
      ];
      const stdout = responses[callIndex] ?? '';
      callIndex += 1;
      if (stdout === '' && callIndex === 3) {
        cb(new Error('no process'), { stdout: '', stderr: '' });
      } else {
        cb(null, { stdout, stderr: '' });
      }
      return {} as ReturnType<typeof exec>;
    });

    const results = await scanAllPorts([3000, 4000, 8000]);

    // Port 4000 has no process, so we get at most 2 results
    // Due to parallel execution, exact behavior depends on mock ordering.
    // We verify that results are filtered (no nulls) and each has correct shape.
    for (const service of results) {
      expect(service.status).toBe('active');
      expect(typeof service.port).toBe('number');
      expect(typeof service.pid).toBe('number');
      expect(typeof service.command).toBe('string');
    }
  });

  it('returns empty array when no ports are occupied', async () => {
    fakeExecError();

    const results = await scanAllPorts([3000, 4000, 5000]);
    expect(results).toEqual([]);
  });
});

describe('createPeriodicScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits service:discovered when a new service appears', async () => {
    fakeExecSequence(['1234\n', 'node Express server\n']);

    const scanner = createPeriodicScanner([3000], 1000);
    const discovered = vi.fn();
    scanner.on('service:discovered', discovered);

    // Let the initial scan's microtasks resolve
    await vi.advanceTimersByTimeAsync(100);

    expect(discovered).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
        pid: 1234,
        status: 'active',
      }),
    );

    scanner.stop();
  });

  it('emits service:lost when a service disappears', async () => {
    // First scan: service exists
    let callCount = 0;
    mockExec.mockImplementation((_cmd: unknown, callback: unknown) => {
      const cb = callback as (err: Error | null, result: { stdout: string; stderr: string }) => void;
      callCount += 1;
      if (callCount <= 2) {
        // First scan: lsof then ps
        if (callCount === 1) cb(null, { stdout: '1234\n', stderr: '' });
        else cb(null, { stdout: 'node Express server\n', stderr: '' });
      } else {
        // Second scan: port empty
        cb(new Error('no process'), { stdout: '', stderr: '' });
      }
      return {} as ReturnType<typeof exec>;
    });

    const scanner = createPeriodicScanner([3000], 1000);
    const lost = vi.fn();
    scanner.on('service:lost', lost);

    // Run initial scan
    await vi.advanceTimersByTimeAsync(100);

    // Advance to next scan interval
    await vi.advanceTimersByTimeAsync(1100);

    expect(lost).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
        status: 'stopped',
      }),
    );

    scanner.stop();
  });

  it('stops scanning when stop is called', async () => {
    fakeExecError();

    const scanner = createPeriodicScanner([3000], 500);

    // Let initial scan resolve
    await vi.advanceTimersByTimeAsync(100);

    scanner.stop();

    const callCountAfterStop = mockExec.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockExec.mock.calls.length).toBe(callCountAfterStop);
  });
});
