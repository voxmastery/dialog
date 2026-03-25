export interface ParsedLogEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly service: string;
  readonly level: LogLevel | null;
  readonly message: string;
  readonly method: string | null;
  readonly path: string | null;
  readonly status: number | null;
  readonly duration_ms: number | null;
  readonly user_id: string | null;
  readonly session_id: string | null;
  readonly request_id: string | null;
  readonly error_message: string | null;
  readonly stack_trace: string | null;
  readonly db_query: string | null;
  readonly external_call: string | null;
  readonly raw: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface DetectedService {
  readonly port: number;
  readonly pid: number;
  readonly framework: string;
  readonly command: string;
  readonly status: 'active' | 'stopped';
}

export interface JourneyEvent {
  readonly id: number;
  readonly user_id: string;
  readonly session_id: string | null;
  readonly request_id: string | null;
  readonly timestamp: string;
  readonly service: string;
  readonly method: string | null;
  readonly path: string | null;
  readonly status: number | null;
  readonly duration_ms: number | null;
  readonly log_id: string;
}

export interface DialogConfig {
  readonly ports: readonly number[];
  readonly retention_hours: number;
  readonly alert_severity: LogLevel;
  readonly alert_cooldown_seconds: number;
  readonly scan_interval_ms: number;
  readonly batch_flush_ms: number;
  readonly batch_flush_count: number;
  readonly embed_interval_ms: number;
}

export interface ErrorGroup {
  readonly error_message: string;
  readonly count: number;
  readonly first_seen: string;
  readonly last_seen: string;
  readonly affected_paths: readonly string[];
  readonly services: readonly string[];
}

export interface ServiceHealth {
  readonly service: string;
  readonly port: number;
  readonly framework: string;
  readonly status: 'OK' | 'WARN' | 'ERROR';
  readonly error_count_5m: number;
  readonly total_logs: number;
  readonly uptime_since: string | null;
}

export interface AiResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly citations: readonly LogCitation[];
  readonly error: string | null;
}

export interface LogCitation {
  readonly timestamp: string;
  readonly service: string;
  readonly message: string;
  readonly log_id: string;
}

export interface QueryFilters {
  readonly last?: string;
  readonly service?: string;
  readonly level?: LogLevel;
  readonly path?: string;
  readonly grep?: string;
  readonly limit?: number;
}
