import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJourney } from '@/hooks/useJourney';
import { GlassCard } from '@/components/ui/GlassCard';
import { MethodBadge } from '@/components/ui/Badge';
import { formatTimestamp, formatDuration } from '@/lib/utils';
import type { JourneyEvent } from '@/lib/types';

function statusText(status: number | null): string {
  if (status === null) return '-';
  if (status === 200) return '200 OK';
  if (status === 201) return '201 Created';
  if (status === 204) return '204 No Content';
  if (status === 301) return '301 Moved';
  if (status === 304) return '304 Not Modified';
  if (status === 400) return '400 Bad Request';
  if (status === 401) return '401 Unauthorized';
  if (status === 403) return '403 Forbidden';
  if (status === 404) return '404 Not Found';
  if (status === 500) return '500 Internal Error';
  if (status === 502) return '502 Bad Gateway';
  if (status === 503) return '503 Unavailable';
  return `${status}`;
}

function statusColor(status: number | null): string {
  if (status === null) return 'text-gray-500';
  if (status >= 500) return 'text-rose-400';
  if (status >= 400) return 'text-amber-400';
  return 'text-emerald-400';
}

function isErrorEvent(event: JourneyEvent): boolean {
  return event.status !== null && event.status >= 500;
}

interface TimelineNodeProps {
  readonly event: JourneyEvent;
  readonly isRootCause: boolean;
  readonly isAfterError: boolean;
  readonly expandedStack: boolean;
  readonly onToggleStack: () => void;
}

function TimelineNode({ event, isRootCause, isAfterError, expandedStack, onToggleStack }: TimelineNodeProps) {
  const navigate = useNavigate();
  const isError = isErrorEvent(event);

  if (isRootCause) {
    return (
      <div className="relative flex gap-12 mb-12">
        {/* Timestamp */}
        <div className="w-20 text-right pt-4">
          <span className="text-xs font-mono text-rose-500/60">{formatTimestamp(event.timestamp)}</span>
        </div>

        {/* Node */}
        <div className="relative z-10 flex flex-col items-center pt-4">
          <div className="w-5 h-5 rounded-full bg-rose-500 border-4 border-dialogbg shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse" />
        </div>

        {/* Card */}
        <div className="flex-1 glass-card rounded-xl p-0 overflow-hidden border-rose-500/40 bg-rose-500/[0.03]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MethodBadge method={event.method} />
              <span className="text-sm font-mono text-white">{event.path ?? '-'}</span>
              <span className="px-1.5 py-0.5 rounded-[4px] bg-rose-500 text-[9px] font-bold text-white tracking-wider uppercase">
                Root Cause
              </span>
            </div>
            <div className="text-right">
              <span className={`block text-xs font-medium ${statusColor(event.status)}`}>
                {statusText(event.status)}
              </span>
              <span className="block text-[10px] text-rose-500/60 font-mono">
                {formatDuration(event.duration_ms)}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-[13px] font-mono text-rose-200">
                Error on {event.method} {event.path}
              </p>
              <div className="bg-black/40 rounded-lg p-3 border border-white/[0.05]">
                <pre className="text-[11px] font-mono text-gray-500 leading-relaxed">
                  {`at service handler (${event.service})`}
                </pre>
                {!expandedStack && (
                  <button
                    onClick={onToggleStack}
                    className="mt-2 text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Expand full stack trace
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 rounded-lg text-xs font-medium text-white hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                onClick={() => navigate('/assistant')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Explain with AI
              </button>
              <button className="px-3 py-2 border border-white/10 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors">
                Create Incident
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular or post-error event
  const dimmed = isAfterError && !isError;

  return (
    <div className={`relative flex gap-12 mb-12 group ${dimmed ? 'opacity-60' : ''}`}>
      {/* Timestamp */}
      <div className="w-20 text-right pt-4">
        <span className={`text-xs font-mono ${isError ? 'text-rose-500/60' : 'text-gray-600 group-hover:text-gray-400 transition-colors'}`}>
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {/* Node */}
      <div className="relative z-10 flex flex-col items-center pt-4">
        <div
          className={`w-3 h-3 rounded-full border-4 border-dialogbg ${
            isError
              ? 'bg-rose-500 ring-1 ring-rose-500/30'
              : dimmed
                ? 'bg-gray-500'
                : 'bg-emerald-500 ring-1 ring-emerald-500/30'
          }`}
        />
      </div>

      {/* Card */}
      <div className="flex-1 glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MethodBadge method={event.method} />
          <span className={`text-sm font-mono ${dimmed ? 'text-gray-400' : 'text-gray-200'}`}>
            {event.path ?? 'Connection Event'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className={`text-xs ${dimmed ? 'text-gray-600' : 'text-gray-500'}`}>{event.service}</span>
          <div className="text-right">
            <span className={`block text-xs font-medium ${statusColor(event.status)}`}>
              {statusText(event.status)}
            </span>
            <span className={`block text-[10px] font-mono ${dimmed ? 'text-gray-700' : 'text-gray-600'}`}>
              {formatDuration(event.duration_ms)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JourneyTimeline() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useJourney(userId);
  const [expandedStackIndex, setExpandedStackIndex] = useState<number | null>(null);

  const handleToggleStack = useCallback((index: number) => {
    setExpandedStackIndex((prev) => (prev === index ? null : index));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm">Loading journey...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm">
          {error instanceof Error ? error.message : 'Failed to load journey'}
        </div>
      </div>
    );
  }

  const { events, event_count, has_errors, root_cause_index } = data;

  // Calculate total duration
  const totalDuration =
    events.length >= 2
      ? new Date(events[events.length - 1].timestamp).getTime() - new Date(events[0].timestamp).getTime()
      : 0;

  const errorCount = events.filter(isErrorEvent).length;

  return (
    <div className="w-full max-w-4xl mx-auto py-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/journeys')}
        className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Journeys
      </button>

      {/* Header */}
      <div className="flex items-end justify-between mb-10 pb-6 border-b border-white/[0.06]">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            Journey — User: <span className="text-indigo-400">{userId}</span>
          </h2>
          <div className="flex gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-[11px] font-medium text-gray-400">
              {event_count} events
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-[11px] font-medium text-gray-400">
              Duration: {formatDuration(totalDuration)}
            </span>
            {has_errors && (
              <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-[11px] font-medium text-rose-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                {errorCount} error{errorCount !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>
        <button
          className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-1"
          onClick={async () => {
            try {
              const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'journey', format: 'json', userId }),
              });
              const data = await res.json();
              const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `journey-${userId}.json`; a.click();
              URL.revokeObjectURL(url);
            } catch { /* handled */ }
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export trace
        </button>
      </div>

      {/* Timeline */}
      <div className="relative pl-2">
        {/* Vertical line */}
        <div
          className="absolute left-[104px] top-0 bottom-0 w-0.5"
          style={{
            background: has_errors
              ? 'linear-gradient(to bottom, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.2) 60%, rgba(244, 63, 94, 0.4) 85%, rgba(244, 63, 94, 0.1) 100%)'
              : 'linear-gradient(to bottom, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))',
          }}
        />

        {events.map((event, index) => {
          const isRootCause = root_cause_index !== null && index === root_cause_index;
          const isAfterRootCause = root_cause_index !== null && index > root_cause_index;

          return (
            <TimelineNode
              key={event.id}
              event={event}
              isRootCause={isRootCause}
              isAfterError={isAfterRootCause}
              expandedStack={expandedStackIndex === index}
              onToggleStack={() => handleToggleStack(index)}
            />
          );
        })}
      </div>
    </div>
  );
}
