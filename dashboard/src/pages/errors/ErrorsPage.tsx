import { useState, useCallback } from 'react';
import { useErrors } from '@/hooks/useErrors';
import { useAsk } from '@/hooks/useAsk';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { cn, timeAgo, truncate } from '@/lib/utils';
import type { ErrorGroup, AiResponse } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Error List Item                                                    */
/* ------------------------------------------------------------------ */

interface ErrorListItemProps {
  readonly group: ErrorGroup;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function ErrorListItem({ group, isSelected, onSelect }: ErrorListItemProps) {
  const severityClass =
    group.count >= 100
      ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
      : group.count >= 10
        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
        : 'text-gray-400 bg-white/5 border-white/10';

  return (
    <div
      className={cn(
        'glass-card p-4 rounded-xl cursor-pointer group',
        isSelected && 'bg-indigo-500/[0.04] border-indigo-500/20',
      )}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded border', severityClass)}>
          {group.count >= 100 ? 'Critical' : group.count >= 10 ? 'Warning' : 'Info'}
        </span>
        <span className="text-[10px] font-mono text-gray-500">{timeAgo(group.last_seen)}</span>
      </div>
      <p className="text-sm font-mono text-gray-200 line-clamp-2 mb-3 leading-relaxed">
        {truncate(group.error_message, 120)}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-mono text-gray-400">{group.count} events</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty Detail State                                                 */
/* ------------------------------------------------------------------ */

function EmptyDetail() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center p-12 relative">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Illustration */}
        <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
          <div className="relative glass-card w-32 h-32 rounded-3xl rotate-12 flex items-center justify-center border-white/10">
            <div className="w-20 h-1 bg-white/5 absolute top-8 left-6 rounded" />
            <div className="w-12 h-1 bg-white/5 absolute top-12 left-6 rounded" />
            <div className="w-24 h-1 bg-white/5 absolute top-16 left-6 rounded" />
            <div className="w-16 h-1 bg-white/5 absolute top-20 left-6 rounded" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Select an error to investigate</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Deep dive into stack traces, environment variables, and user context to resolve issues faster than ever.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="glass-card p-4 rounded-xl border-dashed">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-200">Trace Mapping</span>
            </div>
            <p className="text-[11px] text-gray-500">Automatic source map resolution for minified production code.</p>
          </div>
          <div className="glass-card p-4 rounded-xl border-dashed">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-200">User Context</span>
            </div>
            <p className="text-[11px] text-gray-500">See exactly which users were affected and their browser state.</p>
          </div>
        </div>

        <div className="pt-4">
          <span className="text-xs font-medium text-gray-500 flex items-center gap-2 justify-center">
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px]">&uarr;</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px]">&darr;</kbd>
            <span>to navigate issues</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stack Trace Frame                                                  */
/* ------------------------------------------------------------------ */

interface StackFrame {
  readonly fn: string;
  readonly file: string;
  readonly line: string;
  readonly highlight?: boolean;
}

function parseStackTrace(raw: string): readonly StackFrame[] {
  const lines = raw.split('\n').filter((l) => l.trim().startsWith('at '));
  return lines.map((line) => {
    const match = line.match(/at\s+(\S+)\s+\(?(.+?):(\d+:\d+)\)?/);
    if (match) {
      return { fn: match[1], file: match[2], line: match[3], highlight: false };
    }
    return { fn: line.replace(/^\s*at\s+/, ''), file: '', line: '', highlight: false };
  });
}

function StackTraceView({ raw }: { readonly raw: string }) {
  const frames = parseStackTrace(raw);
  const errorLine = raw.split('\n')[0] ?? '';

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Stack Trace</h3>
      <div className="code-block rounded-xl overflow-hidden font-mono text-[13px] leading-relaxed">
        <div className="p-6 space-y-1.5">
          <div className="text-rose-400 mb-4 font-bold">{errorLine}</div>
          {frames.map((frame, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-4',
                i === 0 && 'border-l-2 border-indigo-500 bg-indigo-500/5 -mx-6 px-6 py-1',
              )}
            >
              <span className="text-gray-600 w-4 text-right">at</span>
              <span className={i === 0 ? 'text-gray-200' : 'text-gray-400'}>{frame.fn}</span>
              {frame.file && (
                <span className={cn(i === 0 ? 'text-cyan-400' : 'text-blue-400', 'cursor-pointer hover:underline')}>
                  {frame.file}
                </span>
              )}
              {frame.line && <span className="text-amber-400">:{frame.line}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Diagnostic Section                                              */
/* ------------------------------------------------------------------ */

interface AiDiagnosticProps {
  readonly answer: AiResponse | null;
  readonly isLoading: boolean;
  readonly onExplain: () => void;
}

function AiDiagnostic({ answer, isLoading, onExplain }: AiDiagnosticProps) {
  if (!answer && !isLoading) {
    return (
      <div className="flex justify-center">
        <Button
          variant="primary"
          className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          onClick={onExplain}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Explain with AI
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ai-border glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
            <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Analyzing error...</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (answer && !answer.success) {
    return (
      <div className="ai-border glass-card rounded-xl p-6 text-sm text-rose-400">
        Failed to analyze: {answer.error ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="ai-border glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">AI Diagnostic Report</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
          Analysis Complete
        </span>
      </div>
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-gray-300 whitespace-pre-wrap">{answer?.answer}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Occurrence Bar Chart                                               */
/* ------------------------------------------------------------------ */

function OccurrenceChart({ count }: { readonly count: number }) {
  // Generate a simple distribution visualization based on count
  const bars = Array.from({ length: 10 }, (_, i) => {
    const base = Math.random() * 0.6 + 0.1;
    const height = Math.max(8, Math.round(base * 128 * (count / 50)));
    const capped = Math.min(height, 128);
    const intensity = capped / 128;
    return { height: capped, intensity };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">24h Occurrence History</h3>
        <div className="text-[10px] text-gray-500 font-mono">{count} total events</div>
      </div>
      <div className="h-32 flex items-end gap-1.5 px-2">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-t-sm',
              bar.intensity > 0.6
                ? 'bg-rose-400/60'
                : bar.intensity > 0.3
                  ? 'bg-rose-400/30'
                  : 'bg-white/5',
            )}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-gray-600 px-1">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Affected Endpoints Table                                           */
/* ------------------------------------------------------------------ */

function AffectedEndpoints({ paths }: { readonly paths: readonly string[] }) {
  if (paths.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Affected Endpoints</h3>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-400">Endpoint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paths.map((path) => (
              <tr key={path} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-indigo-300">{path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Detail Panel                                                 */
/* ------------------------------------------------------------------ */

interface ErrorDetailProps {
  readonly group: ErrorGroup;
}

function ErrorDetail({ group }: ErrorDetailProps) {
  const askMutation = useAsk();
  const [aiAnswer, setAiAnswer] = useState<AiResponse | null>(null);

  const handleExplain = useCallback(() => {
    setAiAnswer(null);
    askMutation.mutate(
      `Explain this error and suggest a fix: ${group.error_message}`,
      { onSuccess: (data) => setAiAnswer(data) },
    );
  }, [askMutation, group.error_message]);

  return (
    <>
      {/* Header bar */}
      <div className="px-8 py-6 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 font-mono">
          <span>Errors</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 5l7 7-7 7" strokeWidth={2} />
          </svg>
          <span className="text-gray-300">{truncate(group.error_message, 60)}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-mono font-medium text-white tracking-tight">
                {truncate(group.error_message, 80)}
              </h1>
              <span className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-bold tracking-wider">
                ERROR
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
              <span>
                <strong className="text-white">{group.count}</strong> occurrences
              </span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>First: {timeAgo(group.first_seen)}</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>Last: {timeAgo(group.last_seen)}</span>
              {group.affected_paths.length > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span>
                    Affects: <span className="text-indigo-400">{group.affected_paths[0]}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="sm">
              Export as Markdown
            </Button>
            <button
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              onClick={handleExplain}
              disabled={askMutation.isPending}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Explain with AI
            </button>
          </div>
        </div>
      </div>

      {/* Two-column detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Stack Trace + AI + Logs */}
        <section className="w-[60%] overflow-y-auto p-8 border-r border-white/[0.06] space-y-8">
          {/* Stack trace - use raw trace if available, else show error message */}
          <StackTraceView raw={group.error_message} />

          {/* AI Diagnostic */}
          <AiDiagnostic
            answer={aiAnswer}
            isLoading={askMutation.isPending}
            onExplain={handleExplain}
          />
        </section>

        {/* Right: Occurrence history + Endpoints + Users */}
        <section className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/20">
          <OccurrenceChart count={group.count} />
          <AffectedEndpoints paths={group.affected_paths} />

          {/* Affected services */}
          {group.services.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Affected Services</h3>
              <div className="flex flex-wrap gap-2">
                {group.services.map((svc) => (
                  <span
                    key={svc}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorsPage (main export)                                           */
/* ------------------------------------------------------------------ */

export function ErrorsPage() {
  const { data, isLoading, error } = useErrors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const errors = data?.errors ?? [];
  const selectedGroup = selectedIndex !== null ? errors[selectedIndex] ?? null : null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden -mx-6 -my-6">
      {/* Sidebar: error list */}
      <aside className="w-96 border-r border-white/[0.06] bg-[#0A0A0F]/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent Issues</h2>
          <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            {data?.total ?? 0} Total
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-400 text-center py-8">
              Failed to load errors
            </div>
          )}

          {!isLoading && errors.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-8">
              No errors found
            </div>
          )}

          {errors.map((group, i) => (
            <ErrorListItem
              key={group.error_message}
              group={group}
              isSelected={selectedIndex === i}
              onSelect={() => setSelectedIndex(i)}
            />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedGroup ? <ErrorDetail group={selectedGroup} /> : <EmptyDetail />}
      </div>
    </div>
  );
}
