import { EventEmitter } from 'node:events';
import type { ParsedLogEntry, LogLevel, DialogConfig } from '../types.js';

export interface AlertDispatcher extends EventEmitter {
  processEntry(entry: ParsedLogEntry): void;
  clearCooldowns(): void;
}

const SEVERITY_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

function normalizeForCooldown(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/\b\d{10,13}\b/g, '<TIMESTAMP>')
    .replace(/\b\d+\b/g, '<N>')
    .replace(/\/[^\s/]+\.[jt]s:\d+/g, '<FILE>')
    .trim();
}

export function createAlertDispatcher(config: DialogConfig): AlertDispatcher {
  const emitter = new EventEmitter() as AlertDispatcher;
  const cooldownMap = new Map<string, number>();
  const cooldownMs = config.alert_cooldown_seconds * 1000;
  const minSeverity = SEVERITY_ORDER[config.alert_severity] ?? SEVERITY_ORDER.ERROR;

  emitter.processEntry = function processEntry(entry: ParsedLogEntry): void {
    if (!entry.level) return;

    const severity = SEVERITY_ORDER[entry.level] ?? 0;
    if (severity < minSeverity) return;

    const errorMsg = entry.error_message ?? entry.message;
    const normalized = normalizeForCooldown(errorMsg);
    const now = Date.now();
    const lastAlert = cooldownMap.get(normalized);

    if (lastAlert && now - lastAlert < cooldownMs) {
      return; // Still in cooldown
    }

    cooldownMap.set(normalized, now);

    // Emit alert event
    emitter.emit('alert', {
      level: entry.level,
      service: entry.service,
      message: errorMsg,
      path: entry.path,
      timestamp: entry.timestamp.toISOString(),
    });

    // Desktop notification
    sendDesktopNotification(entry.level, entry.service, errorMsg);
  };

  emitter.clearCooldowns = function clearCooldowns(): void {
    cooldownMap.clear();
  };

  return emitter;
}

async function sendDesktopNotification(level: LogLevel, service: string, message: string): Promise<void> {
  try {
    const notifier = await import('node-notifier');
    notifier.default.notify({
      title: `Dialog Alert — ${level}`,
      message: `[${service}] ${message.slice(0, 200)}`,
      sound: level === 'FATAL',
      timeout: 10,
    });
  } catch {
    // node-notifier not available, skip
  }
}
