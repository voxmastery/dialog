import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseToml } from 'toml';
import type { DialogConfig } from '../types.js';
import { logger } from '../lib/logger.js';
import {
  DEFAULT_CONFIG,
  DIALOG_DIR,
  DATA_DIR,
  CONFIG_FILE,
  CHROMA_DIR,
  PARQUET_DIR,
} from './defaults.js';

export function getDialogHome(): string {
  return join(homedir(), DIALOG_DIR);
}

export function getDataDir(): string {
  return join(getDialogHome(), DATA_DIR);
}

export function ensureDirectories(): void {
  const dirs = [
    getDialogHome(),
    getDataDir(),
    join(getDataDir(), CHROMA_DIR),
    join(getDataDir(), PARQUET_DIR),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function loadConfig(): DialogConfig {
  const configPath = join(getDialogHome(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = parseToml(raw) as Partial<DialogConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      ports: parsed.ports
        ? [...parsed.ports]
        : [...DEFAULT_CONFIG.ports],
    };
  } catch (err) {
    logger.warn({ err, configPath }, 'Config parse failed, using defaults');
    return { ...DEFAULT_CONFIG };
  }
}
