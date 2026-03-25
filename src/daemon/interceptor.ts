import { spawn, type ChildProcess } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import type { DetectedService, ParsedLogEntry } from '../types.js';
import { logger } from '../lib/logger.js';

export interface LogInterceptor extends EventEmitter {
  attach(service: DetectedService): void;
  detach(port: number): void;
  detachAll(): void;
}

interface AttachedProcess {
  readonly service: DetectedService;
  readonly cleanup: () => void;
}

export function createLogInterceptor(): LogInterceptor {
  const emitter = new EventEmitter() as LogInterceptor;
  const attached = new Map<number, AttachedProcess>();
  const lineBuffers = new Map<number, string[]>();
  let flushTimers = new Map<number, NodeJS.Timeout>();

  function processLine(service: DetectedService, line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    const portBuffer = lineBuffers.get(service.port) ?? [];
    portBuffer.push(trimmed);
    lineBuffers.set(service.port, portBuffer);

    // Flush if buffer is full
    if (portBuffer.length >= 50) {
      flushBuffer(service);
    } else if (!flushTimers.has(service.port)) {
      // Set flush timer
      const timer = setTimeout(() => {
        flushBuffer(service);
        flushTimers.delete(service.port);
      }, 100);
      flushTimers.set(service.port, timer);
    }
  }

  function flushBuffer(service: DetectedService): void {
    const buffer = lineBuffers.get(service.port);
    if (!buffer || buffer.length === 0) return;

    const lines = [...buffer];
    lineBuffers.set(service.port, []);

    const timer = flushTimers.get(service.port);
    if (timer) {
      clearTimeout(timer);
      flushTimers.delete(service.port);
    }

    emitter.emit('lines', { service, lines });
  }

  function attachViaProcFd(service: DetectedService): (() => void) | null {
    // Linux: read from /proc/PID/fd/1 (stdout)
    const fdPath = `/proc/${service.pid}/fd/1`;
    if (!existsSync(fdPath)) return null;

    try {
      const stream = createReadStream(fdPath, { encoding: 'utf-8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      rl.on('line', (line) => processLine(service, line));
      rl.on('error', () => { /* process may have died */ });

      return () => {
        rl.close();
        stream.destroy();
      };
    } catch (err) {
      logger.debug({ err, port: service.port, pid: service.pid }, 'Failed to attach via /proc/fd');
      return null;
    }
  }

  function attachViaStrace(service: DetectedService): (() => void) | null {
    // Use strace to capture writes to fd 1 and 2
    try {
      const strace = spawn('strace', [
        '-p', String(service.pid),
        '-e', 'trace=write',
        '-s', '4096',
        '-f',
        '-qq',
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      const rl = createInterface({ input: strace.stderr!, crlfDelay: Infinity });

      rl.on('line', (line) => {
        // strace output: write(1, "log line\n", 10) = 10
        const match = line.match(/write\([12],\s*"(.+?)(?:\\n)?",\s*\d+\)/);
        if (match?.[1]) {
          const decoded = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          for (const l of decoded.split('\n')) {
            processLine(service, l);
          }
        }
      });

      strace.on('error', () => { /* strace not available */ });

      return () => {
        strace.kill();
        rl.close();
      };
    } catch (err) {
      logger.debug({ err, port: service.port, pid: service.pid }, 'Failed to attach via strace');
      return null;
    }
  }

  emitter.attach = function attach(service: DetectedService): void {
    if (attached.has(service.port)) return;

    // Try /proc/PID/fd first (Linux), then strace as fallback
    let cleanup = attachViaProcFd(service);
    if (!cleanup) {
      cleanup = attachViaStrace(service);
    }

    if (cleanup) {
      attached.set(service.port, { service, cleanup });
      emitter.emit('attached', service);
    } else {
      emitter.emit('attach-failed', service);
    }
  };

  emitter.detach = function detach(port: number): void {
    const entry = attached.get(port);
    if (entry) {
      entry.cleanup();
      attached.delete(port);
      flushBuffer(entry.service);
      lineBuffers.delete(port);
      emitter.emit('detached', entry.service);
    }
  };

  emitter.detachAll = function detachAll(): void {
    for (const [port] of attached) {
      emitter.detach(port);
    }
    for (const timer of flushTimers.values()) {
      clearTimeout(timer);
    }
    flushTimers = new Map();
  };

  return emitter;
}
