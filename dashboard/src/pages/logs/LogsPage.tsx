import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLiveLogs } from '@/hooks/useLiveLogs';
import { useLogs } from '@/hooks/useLogs';
import { useServices } from '@/hooks/useServices';
import { cn, formatTimestamp, formatDuration } from '@/lib/utils';
import type { ParsedLogEntry, LogLevel } from '@/lib/types';

type ViewMode = 'live' | 'historical';

const LEVELS: readonly (LogLevel | 'ALL')[] = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;

const LEVEL_CLASS: Record<string, string> = {
  DEBUG: 'lvl-dbg',
  INFO: 'lvl-inf',
  WARN: 'lvl-wrn',
  ERROR: 'lvl-err',
  FATAL: 'lvl-ftl',
};

const METHOD_CLASS: Record<string, string> = {
  GET: 'm-get',
  POST: 'm-post',
  PUT: 'm-put',
  PATCH: 'm-put',
  DELETE: 'm-del',
};

const STATUS_CLASS: Record<string, string> = {
  '2': 'status-200',
  '3': 'status-200',
  '4': 'status-400',
  '5': 'status-500',
};

function statusColorClass(status: number | null): string {
  if (status === null) return '';
  const category = String(Math.floor(status / 100));
  return STATUS_CLASS[category] ?? '';
}

export function LogsPage() {
  const [mode, setMode] = useState<ViewMode>('live');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [pathFilter, setPathFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [histTimeRange, setHistTimeRange] = useState<string>('15m');
  const [paused, setPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { logs: liveLogs, connected, clear } = useLiveLogs();
  const { data: servicesData } = useServices();
  const { data: historicalData } = useLogs(
    mode === 'historical'
      ? {
          last: histTimeRange,
          service: serviceFilter || undefined,
          level: levelFilter !== 'ALL' ? levelFilter : undefined,
          path: pathFilter || undefined,
          grep: searchFilter || undefined,
          limit: 200,
        }
      : undefined,
  );

  const services = servicesData?.services ?? [];

  // Filter live logs client-side
  const filteredLogs = useMemo(() => {
    const source = mode === 'live' ? liveLogs : (historicalData?.logs ?? []);
    return source.filter((log) => {
      if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
      if (serviceFilter && log.service !== serviceFilter) return false;
      if (pathFilter && !(log.path ?? '').includes(pathFilter)) return false;
      if (searchFilter && !log.message.toLowerCase().includes(searchFilter.toLowerCase()) && !log.raw.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [mode, liveLogs, historicalData, levelFilter, serviceFilter, pathFilter, searchFilter]);

  const totalCount = mode === 'live' ? liveLogs.length : (historicalData?.total ?? 0);

  // Auto-scroll to bottom for live mode
  const autoScrollRef = useRef(true);
  useEffect(() => {
    if (mode === 'live' && autoScrollRef.current && !paused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, mode, paused]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  const jumpToLatest = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      autoScrollRef.current = true;
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Filter Header */}
      <header className="relative z-10 px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left filter island: service + level */}
        <div className="filter-island flex items-center bg-[var(--bg-glass)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.06)] rounded-2xl p-1.5 gap-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          {/* Service dropdown */}
          <div className="control-pill flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] transition-all">
            <div className="framework-badge w-4 h-4 rounded bg-gradient-to-br from-[#111] to-[#333] flex items-center justify-center text-[9px] font-bold text-white border border-[rgba(255,255,255,0.06)]">
              {serviceFilter ? serviceFilter.charAt(0).toUpperCase() : 'A'}
            </div>
            <select
              className="bg-transparent border-none text-inherit text-[13px] font-medium outline-none cursor-pointer appearance-none"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="">All Services</option>
              {services.map((svc) => (
                <option key={svc.port} value={svc.service}>{svc.service}</option>
              ))}
            </select>
          </div>

          {/* Level filter */}
          <div className="control-pill flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] transition-all">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--level-error)' }} />
            <select
              className="bg-transparent border-none text-inherit text-[13px] font-medium outline-none cursor-pointer appearance-none"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'ALL')}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl === 'ALL' ? 'Level' : lvl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center filter island: path + search */}
        <div className="filter-island flex items-center bg-[var(--bg-glass)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.06)] rounded-2xl p-1.5 gap-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex-grow max-w-[600px]">
          {/* Path input */}
          <div className="input-wrapper flex items-center bg-[#16161C] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 h-8 flex-grow transition-colors focus-within:border-[var(--text-tertiary)]">
            <svg className="input-icon w-3.5 h-3.5 text-[var(--text-tertiary)] mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              type="text"
              className="bg-transparent border-none text-[var(--text-primary)] font-mono text-[13px] w-full outline-none placeholder:text-[var(--text-tertiary)]"
              placeholder="/api/v2/users..."
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
            />
          </div>

          {/* Search input */}
          <div className="input-wrapper flex items-center bg-[#16161C] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 h-8 transition-colors focus-within:border-[var(--text-tertiary)]">
            <svg className="input-icon w-3.5 h-3.5 text-[var(--text-tertiary)] mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="bg-transparent border-none text-[var(--text-primary)] font-mono text-[13px] w-[140px] outline-none placeholder:text-[var(--text-tertiary)]"
              placeholder="Search payload"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Right filter island: live/hist toggle + time range */}
        <div className="filter-island flex items-center bg-[var(--bg-glass)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.06)] rounded-2xl p-1.5 gap-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="segmented-control flex bg-[#16161C] p-1 rounded-2xl border border-[rgba(255,255,255,0.06)]">
            <button
              className={cn(
                'segment flex items-center gap-1.5 px-4 py-1 text-xs font-medium rounded-lg cursor-pointer',
                mode === 'live'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                  : 'text-[var(--text-secondary)]',
              )}
              onClick={() => setMode('live')}
            >
              <div
                className={cn('w-1.5 h-1.5 rounded-full', mode === 'live' && 'pulse')}
                style={{ background: '#42D392' }}
              />
              Live
            </button>
            <button
              className={cn(
                'segment flex items-center gap-1.5 px-4 py-1 text-xs font-medium rounded-lg cursor-pointer',
                mode === 'historical'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                  : 'text-[var(--text-secondary)]',
              )}
              onClick={() => setMode('historical')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Hist
            </button>
          </div>

          <button
            className={cn(
              'control-pill flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all',
              mode === 'historical'
                ? 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)]'
                : 'text-[var(--text-secondary)] opacity-50 cursor-default',
            )}
            disabled={mode !== 'historical'}
          >
            <select
              className="bg-transparent border-none text-inherit text-[13px] font-medium outline-none cursor-pointer appearance-none"
              value={histTimeRange}
              onChange={(e) => setHistTimeRange(e.target.value)}
              disabled={mode !== 'historical'}
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="24h">24h</option>
            </select>
          </button>
        </div>
      </header>

      {/* Log Stream */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto overflow-x-hidden px-4 md:px-6 font-mono text-[13px] leading-relaxed pb-20"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredLogs.map((log, idx) => (
          <LogLine key={log.id ?? idx} log={log} />
        ))}
        {filteredLogs.length === 0 && (
          <div className="flex items-center justify-center h-40 text-sm text-[var(--text-tertiary)]">
            {mode === 'live' && !connected
              ? 'Connecting to live stream...'
              : 'No logs matching current filters.'}
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-glass)] backdrop-blur-[30px] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          {/* Barcode visualizer */}
          <div className="flex items-end gap-0.5 h-6 pb-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-[var(--text-tertiary)] rounded-[1px]"
                style={{
                  height: `${[30, 60, 40, 80, 50, 90, 30, 70, 40, 60, 80, 50][i]}%`,
                  transformOrigin: 'bottom',
                  animation: `equalize 1.5s infinite ease-in-out alternate`,
                  animationDelay: `${[0.1, 0.3, 0.2, 0.5, 0.4, 0.7, 0.6, 0.8, 0.9, 1.0, 0.2, 0.5][i]}s`,
                }}
              />
            ))}
          </div>

          {/* Throughput metric */}
          <div className="font-sans font-light text-[28px] tracking-tight text-[var(--text-primary)] flex items-baseline gap-1">
            {filteredLogs.length}
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-normal">
              {mode === 'live' ? 'buffered' : 'results'}
            </span>
          </div>

          <div className="font-mono text-xs text-[var(--text-tertiary)] border-l border-[rgba(255,255,255,0.06)] pl-4 h-6 flex items-center">
            Total: {totalCount.toLocaleString()}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Jump to latest */}
          <button
            className="icon-btn w-9 h-9 rounded-full bg-[#16161C] border border-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--text-primary)] transition-all"
            title="Jump to Latest"
            aria-label="Jump to latest"
            onClick={jumpToLatest}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>

          {/* Clear */}
          <button
            className="icon-btn w-9 h-9 rounded-full bg-[#16161C] border border-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--text-primary)] transition-all"
            title="Clear Logs"
            aria-label="Clear logs"
            onClick={clear}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Pause/Resume */}
          <button
            className={cn(
              'icon-btn w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-all ml-2',
              paused
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.06)] text-[var(--text-primary)]',
            )}
            title={paused ? 'Resume Stream' : 'Pause Stream'}
            aria-label={paused ? 'Resume stream' : 'Pause stream'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ---- Log Line Component ---- */

function LogLine({ log }: { log: ParsedLogEntry }) {
  const isError = log.level === 'ERROR' || log.level === 'FATAL';
  const levelClass = log.level ? (LEVEL_CLASS[log.level] ?? '') : '';
  const methodClass = log.method ? (METHOD_CLASS[log.method] ?? '') : '';
  const sClass = statusColorClass(log.status);

  return (
    <div
      className={cn(
        'log-line flex items-start py-1.5 px-3 border-b border-[rgba(255,255,255,0.02)] gap-4 relative',
        isError && 'error-line bg-gradient-to-r from-[rgba(230,69,83,0.05)] to-transparent',
        'hover:bg-[rgba(255,255,255,0.02)]',
        'animate-[slideUpFade_0.4s_ease-out_forwards]',
      )}
      style={{ opacity: 0, transform: 'translateY(10px)' }}
    >
      {/* Left accent bar for errors */}
      {isError && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--level-error)]" />
      )}

      {/* Meta column */}
      <div className="flex items-center gap-3 shrink-0 w-[380px]">
        <span className="text-[var(--text-tertiary)] w-[115px] shrink-0">
          {formatTimestamp(log.timestamp)}
        </span>
        <span className="text-[#00E5FF] border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.05)] px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap tracking-wide">
          {log.service}
        </span>
        {log.level && (
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded w-[60px] text-center tracking-wide', levelClass)}>
            {log.level}
          </span>
        )}
      </div>

      {/* Content column */}
      <div className="flex-grow flex flex-col gap-1 min-w-0">
        <div className="text-[var(--text-primary)] break-all">
          {log.method && (
            <span className="http-details inline-flex items-center gap-2 bg-[rgba(0,0,0,0.3)] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.06)] text-xs">
              <span className={cn('font-bold', methodClass)}>{log.method}</span>
              {log.path && <span>{log.path}</span>}
              {log.status !== null && <span className={sClass}>{log.status}</span>}
            </span>
          )}
          {log.duration_ms !== null && (
            <span className="text-[var(--text-secondary)] ml-2">{formatDuration(log.duration_ms)}</span>
          )}
          {log.message && <span className="ml-2">{log.message}</span>}
        </div>

        {/* Stack trace for errors */}
        {log.stack_trace && (
          <div className="render-block stack-block bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 mt-1.5 text-xs overflow-x-auto border-l-2 border-l-[rgba(230,69,83,0.4)]">
            {log.error_message && (
              <span className="text-[var(--level-error)] font-bold block mb-2">{log.error_message}</span>
            )}
            <pre className="text-[var(--text-secondary)] whitespace-pre-wrap">{log.stack_trace}</pre>
          </div>
        )}

        {/* DB query */}
        {log.db_query && (
          <div className="render-block sql-block bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 mt-1.5 text-xs overflow-x-auto border-l-2 border-l-[var(--method-post)]">
            <pre className="text-[var(--text-primary)] whitespace-pre-wrap">{log.db_query}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
