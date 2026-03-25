import chalk from 'chalk';
import type { JourneyEvent } from '../types.js';

export interface ReconstructedJourney {
  readonly userId: string;
  readonly events: readonly JourneyEvent[];
  readonly rootCauseIndex: number | null;
  readonly hasErrors: boolean;
}

export function reconstructJourney(
  events: readonly JourneyEvent[],
): ReconstructedJourney {
  const userId = events.length > 0 ? events[0].user_id : '';

  const rootCauseIndex = events.findIndex(
    (event) => event.status !== null && event.status >= 500,
  );

  const hasErrors = events.some(
    (event) => event.status !== null && event.status >= 500,
  );

  return {
    userId,
    events,
    rootCauseIndex: rootCauseIndex === -1 ? null : rootCauseIndex,
    hasErrors,
  };
}

function formatStatus(status: number | null): string {
  if (status === null) {
    return '---';
  }
  if (status >= 500) {
    return chalk.red(String(status));
  }
  if (status >= 400) {
    return chalk.yellow(String(status));
  }
  return chalk.green(String(status));
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return '';
  }
  return ` (${durationMs}ms)`;
}

export function formatJourneyForCli(journey: ReconstructedJourney): string {
  const lines = journey.events.map((event, index) => {
    const method = event.method ?? '???';
    const path = event.path ?? '/';
    const status = formatStatus(event.status);
    const duration = formatDuration(event.duration_ms);
    const rootCauseMarker =
      index === journey.rootCauseIndex
        ? chalk.red(' ← ROOT CAUSE')
        : '';

    return `${event.timestamp} ${method} ${path} → ${status}${duration}${rootCauseMarker}`;
  });

  return lines.join('\n');
}
