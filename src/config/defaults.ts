import type { DialogConfig } from '../types.js';

export const DEFAULT_CONFIG: DialogConfig = {
  ports: [3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888],
  retention_hours: 168, // 7 days
  alert_severity: 'ERROR',
  alert_cooldown_seconds: 300, // 5 minutes
  scan_interval_ms: 10000,
  batch_flush_ms: 100,
  batch_flush_count: 50,
  embed_interval_ms: 30000,
};

export const DIALOG_DIR = '.dialog';
export const DATA_DIR = 'data';
export const CONFIG_FILE = 'config.toml';
export const PID_FILE = 'dialog.pid';
export const DUCKDB_FILE = 'logs.duckdb';
export const SQLITE_FILE = 'journey.sqlite';
export const CHROMA_DIR = 'chroma';
export const PARQUET_DIR = 'parquet';
