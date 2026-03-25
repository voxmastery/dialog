import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import type { DetectedService } from '../types.js';
import { identifyFramework } from './frameworks.js';
import { logger } from '../lib/logger.js';

const execAsync = promisify(exec);

export async function scanPort(port: number): Promise<DetectedService | null> {
  try {
    const { stdout: pidOutput } = await execAsync(`lsof -i :${port} -t`);
    const pidStr = pidOutput.trim().split('\n')[0];
    if (!pidStr) {
      return null;
    }

    const pid = parseInt(pidStr, 10);
    if (Number.isNaN(pid)) {
      return null;
    }

    const { stdout: commandOutput } = await execAsync(`ps -p ${pid} -o command=`);
    const command = commandOutput.trim();
    if (!command) {
      return null;
    }

    const framework = identifyFramework(command);

    return {
      port,
      pid,
      framework,
      command,
      status: 'active',
    };
  } catch (err) {
    logger.debug({ err, port }, 'Port scan found no service');
    return null;
  }
}

export async function scanAllPorts(ports: readonly number[]): Promise<readonly DetectedService[]> {
  const results = await Promise.all(ports.map(scanPort));
  return results.filter((service): service is DetectedService => service !== null);
}

export interface PeriodicScanner extends EventEmitter {
  stop(): void;
}

export function createPeriodicScanner(
  ports: readonly number[],
  intervalMs: number,
): PeriodicScanner {
  const emitter = new EventEmitter() as PeriodicScanner;
  let knownServices = new Map<number, DetectedService>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const scan = async (): Promise<void> => {
    try {
      const currentServices = await scanAllPorts(ports);
      const currentByPort = new Map(
        currentServices.map((s) => [s.port, s]),
      );

      // Detect newly discovered services
      for (const [port, service] of currentByPort) {
        if (!knownServices.has(port)) {
          emitter.emit('service:discovered', service);
        }
      }

      // Detect lost services
      for (const [port, service] of knownServices) {
        if (!currentByPort.has(port)) {
          const stoppedService: DetectedService = {
            ...service,
            status: 'stopped',
          };
          emitter.emit('service:lost', stoppedService);
        }
      }

      knownServices = currentByPort;
    } catch (err) {
      logger.debug({ err }, 'Periodic port scan failed, will retry next interval');
    }
  };

  // Run initial scan immediately
  void scan();

  timer = setInterval(() => void scan(), intervalMs);

  emitter.stop = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return emitter;
}
