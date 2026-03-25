const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*(Z|[+-]\d{2}:?\d{2})?/g;
const NUMERIC_ID_PATTERN = /\b\d{4,}\b/g;
const FILE_PATH_LINE_PATTERN = /(?:\/[\w.-]+)+:\d+(?::\d+)?/g;

export function normalizeErrorMessage(message: string): string {
  return message
    .replace(UUID_PATTERN, '<UUID>')
    .replace(TIMESTAMP_PATTERN, '<TIMESTAMP>')
    .replace(FILE_PATH_LINE_PATTERN, '<FILE_PATH>')
    .replace(NUMERIC_ID_PATTERN, '<ID>')
    .trim();
}

const ANOMALY_THRESHOLD = 3;

export function detectAnomaly(
  currentRate: number,
  rollingAverage: number,
): boolean {
  if (rollingAverage <= 0) {
    return currentRate > 0;
  }
  return currentRate > ANOMALY_THRESHOLD * rollingAverage;
}
