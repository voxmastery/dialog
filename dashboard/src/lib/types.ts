export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface ParsedLogEntry {
  readonly id: string;
  readonly timestamp: string;
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

export interface ErrorGroup {
  readonly error_message: string;
  readonly count: number;
  readonly first_seen: string;
  readonly last_seen: string;
  readonly affected_paths: readonly string[];
  readonly services: readonly string[];
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

export interface ServiceInfo {
  readonly port: number;
  readonly service: string;
  readonly framework: string;
  readonly pid: number;
  readonly status: 'OK' | 'WARN' | 'ERROR';
  readonly log_count_5m: number;
  readonly error_count_5m: number;
}

export interface HealthResponse {
  readonly status: string;
  readonly uptime: number;
  readonly services: number;
  readonly service_list: readonly { port: number; framework: string; status: string }[];
}

export interface AiResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly citations: readonly { timestamp: string; service: string; message: string }[];
  readonly error: string | null;
}

export interface LatencyMetrics {
  readonly total_requests: number;
  readonly p50_ms: number | null;
  readonly p95_ms: number | null;
  readonly p99_ms: number | null;
  readonly avg_ms: number | null;
}

export interface JourneyResponse {
  readonly user_id: string;
  readonly event_count: number;
  readonly has_errors: boolean;
  readonly root_cause_index: number | null;
  readonly events: readonly JourneyEvent[];
}
