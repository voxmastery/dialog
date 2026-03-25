import { EventEmitter } from 'node:events';
import type { DetectedService, ParsedLogEntry, DialogConfig } from '../types.js';
import { scanAllPorts, createPeriodicScanner } from './detector.js';
import { createLogInterceptor } from './interceptor.js';
import { parseLine, parseMultiLine } from '../parser/index.js';

export interface Daemon extends EventEmitter {
  start(): Promise<void>;
  stop(): void;
  getServices(): readonly DetectedService[];
  onLog(handler: (entry: ParsedLogEntry) => void): void;
}

export function createDaemon(config: DialogConfig): Daemon {
  const emitter = new EventEmitter() as Daemon;
  const interceptor = createLogInterceptor();
  let scanner: ReturnType<typeof createPeriodicScanner> | null = null;
  const services = new Map<number, DetectedService>();

  interceptor.on('lines', ({ service, lines }: { service: DetectedService; lines: string[] }) => {
    const entries = parseMultiLine(lines, `localhost:${service.port}`, service.framework);
    for (const entry of entries) {
      emitter.emit('log', entry);
    }
  });

  emitter.start = async function start(): Promise<void> {
    // Initial scan
    const detected = await scanAllPorts([...config.ports]);
    for (const svc of detected) {
      services.set(svc.port, svc);
      interceptor.attach(svc);
    }

    // Periodic re-scan
    scanner = createPeriodicScanner([...config.ports], config.scan_interval_ms);

    scanner.on('service:discovered', (svc: DetectedService) => {
      services.set(svc.port, svc);
      interceptor.attach(svc);
      emitter.emit('service:discovered', svc);
    });

    scanner.on('service:lost', (svc: DetectedService) => {
      services.delete(svc.port);
      interceptor.detach(svc.port);
      emitter.emit('service:lost', svc);
    });

    emitter.emit('started', [...services.values()]);
  };

  emitter.stop = function stop(): void {
    interceptor.detachAll();
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    services.clear();
    emitter.emit('stopped');
  };

  emitter.getServices = function getServices(): readonly DetectedService[] {
    return [...services.values()];
  };

  emitter.onLog = function onLog(handler: (entry: ParsedLogEntry) => void): void {
    emitter.on('log', handler);
  };

  return emitter;
}
