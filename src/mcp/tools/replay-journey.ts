import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';
import { reconstructJourney } from '../../journey/reconstruct.js';
import type { JourneyEvent } from '../../types.js';

export const TOOL_NAME = 'dialog_replay_journey';
export const TOOL_DESCRIPTION = 'Reconstruct and replay a user\'s server-side journey as a chronological timeline. Shows every request the user made, with status codes, durations, and root cause highlighting for errors. Use when investigating what a specific user experienced.';

export const inputSchema = {
  user_id: z.string()
    .describe('User ID to trace (from JWT sub, x-user-id header, etc.)')
    .optional(),
  session_id: z.string()
    .describe('Session ID to trace')
    .optional(),
};

export interface ReplayJourneyResult {
  readonly user_id: string | null;
  readonly session_id: string | null;
  readonly event_count: number;
  readonly has_errors: boolean;
  readonly root_cause: RootCauseInfo | null;
  readonly timeline: readonly TimelineEntry[];
}

interface RootCauseInfo {
  readonly index: number;
  readonly timestamp: string;
  readonly method: string | null;
  readonly path: string | null;
  readonly status: number | null;
  readonly message: string;
}

interface TimelineEntry {
  readonly timestamp: string;
  readonly method: string | null;
  readonly path: string | null;
  readonly status: number | null;
  readonly duration_ms: number | null;
  readonly service: string;
  readonly is_error: boolean;
  readonly is_root_cause: boolean;
}

export async function handler(
  args: { user_id?: string; session_id?: string },
  ctx: ToolContext
): Promise<ToolResponse<ReplayJourneyResult>> {
  const startTime = Date.now();

  if (!args.user_id && !args.session_id) {
    return createErrorResponse(TOOL_NAME, 'Provide either user_id or session_id', startTime);
  }

  try {
    const events: JourneyEvent[] = args.user_id
      ? ctx.journeyIndex.getJourneyByUser(args.user_id)
      : ctx.journeyIndex.getJourneyBySession(args.session_id!);

    if (events.length === 0) {
      const idType = args.user_id ? 'user_id' : 'session_id';
      const idValue = args.user_id ?? args.session_id;
      return createErrorResponse(TOOL_NAME, `No journey found for ${idType}: ${idValue}`, startTime);
    }

    const journey = reconstructJourney(events);

    const timeline: readonly TimelineEntry[] = journey.events.map((e, i) => ({
      timestamp: e.timestamp,
      method: e.method,
      path: e.path,
      status: e.status,
      duration_ms: e.duration_ms,
      service: e.service,
      is_error: e.status !== null && e.status >= 500,
      is_root_cause: i === journey.rootCauseIndex,
    }));

    let rootCause: RootCauseInfo | null = null;
    if (journey.rootCauseIndex !== null) {
      const rc = journey.events[journey.rootCauseIndex]!;
      rootCause = {
        index: journey.rootCauseIndex,
        timestamp: rc.timestamp,
        method: rc.method,
        path: rc.path,
        status: rc.status,
        message: `${rc.method ?? 'UNKNOWN'} ${rc.path ?? '/'} returned ${rc.status ?? 'unknown status'}`,
      };
    }

    return createSuccessResponse(TOOL_NAME, {
      user_id: args.user_id ?? null,
      session_id: args.session_id ?? null,
      event_count: events.length,
      has_errors: journey.hasErrors,
      root_cause: rootCause,
      timeline,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error replaying journey';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
