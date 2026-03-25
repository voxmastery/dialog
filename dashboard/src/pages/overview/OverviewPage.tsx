import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useHealth } from '@/hooks/useHealth';
import { useServices } from '@/hooks/useServices';
import { useErrors } from '@/hooks/useErrors';
import { useLatency, useTimeseries } from '@/hooks/useMetrics';
import { cn, formatDuration } from '@/lib/utils';
import type { ErrorGroup, ServiceInfo } from '@/lib/types';

type TimeRange = 'Last 60m' | 'Last 24h';

export function OverviewPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('Last 60m');
  const { data: health } = useHealth();
  const { data: servicesData } = useServices();
  const { data: errorsData } = useErrors({ last: '5m' });
  const { data: latency } = useLatency();
  const { data: timeseriesData } = useTimeseries({
    interval: timeRange === 'Last 60m' ? 60 : 1440,
  });

  const services = servicesData?.services ?? [];
  const errors = errorsData?.errors ?? [];
  const totalErrors = errorsData?.total ?? 0;

  const maxErrorCount = useMemo(
    () => Math.max(...errors.map((e) => e.count), 1),
    [errors],
  );

  const chartData = useMemo(() => {
    if (!timeseriesData?.timeseries) return [];
    const allSeries = Object.values(timeseriesData.timeseries);
    if (allSeries.length === 0) return [];
    // Merge all service timeseries into one error-rate line
    const merged = new Map<string, number>();
    for (const series of allSeries) {
      for (const point of series) {
        merged.set(point.timestamp, (merged.get(point.timestamp) ?? 0) + point.count);
      }
    }
    return Array.from(merged.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, count]) => ({ timestamp, count }));
  }, [timeseriesData]);

  const serviceCount = health?.services ?? services.length;
  const allHealthy = services.every((s) => s.status === 'OK');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time metrics for localhost environment.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium bg-white/[0.05] border border-white/10 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Last 1 Hour
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-indigo-600 border border-indigo-500 rounded-md text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.3)]" aria-label="Refresh data">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Services */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-400">Services</h3>
            <div className="p-1.5 bg-white/[0.04] rounded-md text-gray-400 group-hover:text-emerald-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-semibold text-white tracking-tight">{serviceCount}</span>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn(
                'w-2 h-2 rounded-full',
                allHealthy ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-amber-500',
              )} />
              <span className={cn(
                'text-xs font-medium',
                allHealthy ? 'text-emerald-400' : 'text-amber-400',
              )}>
                {allHealthy ? 'All healthy' : 'Issues detected'}
              </span>
            </div>
          </div>
        </div>

        {/* Errors */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-400">Errors <span className="text-xs text-gray-500 font-normal">(5m)</span></h3>
            <div className="p-1.5 bg-white/[0.04] rounded-md text-gray-400 group-hover:text-amber-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-semibold text-amber-500 tracking-tight">{totalErrors}</span>
            <div className="flex items-center gap-1 mb-1.5 text-amber-500/80">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xs font-medium">from last period</span>
            </div>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-400">Avg Latency</h3>
            <div className="p-1.5 bg-white/[0.04] rounded-md text-gray-400 group-hover:text-indigo-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-4xl font-semibold text-white tracking-tight">
              {latency?.avg_ms != null ? Math.round(latency.avg_ms) : '--'}
              <span className="text-2xl text-gray-500 font-medium">ms</span>
            </span>
            <div className="w-20 h-10 opacity-80 group-hover:opacity-100 transition-opacity">
              <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path
                  d="M0,30 C10,35 15,20 25,25 C35,30 40,15 50,20 C60,25 70,10 80,15 C90,20 95,5 100,10"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-400">Active Users</h3>
            <div className="p-1.5 bg-white/[0.04] rounded-md text-gray-400 group-hover:text-blue-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-semibold text-white tracking-tight">0</span>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-xs font-medium text-gray-500">Currently active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Rate Chart + Top Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Error Rate Chart */}
        <div className="glass-card rounded-xl p-5 lg:col-span-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <div className="w-2 h-4 bg-rose-500 rounded-sm" />
              Error Rate
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500/50" /> 4xx/5xx responses
              </span>
              <select
                className="bg-transparent border border-white/10 text-xs text-gray-400 rounded px-2 py-1 outline-none focus:border-white/20"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option>Last 60m</option>
                <option>Last 24h</option>
              </select>
            </div>
          </div>
          <div className="relative flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="#F43F5E" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: '#4B5563', fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(ts: string) => {
                    const d = new Date(ts);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#4B5563', fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#E5E7EB',
                  }}
                  labelFormatter={(ts: string) => {
                    const d = new Date(ts);
                    return d.toLocaleTimeString('en-US', { hour12: false });
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fill="url(#errorGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#0A0A0F', stroke: '#F43F5E', strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Errors */}
        <div className="glass-card rounded-xl p-5 lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Top Errors
            </h2>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium" onClick={() => navigate('/logs')}>
              View Logs &rarr;
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {errors.slice(0, 5).map((error, idx) => (
              <ErrorRow key={error.error_message} error={error} maxCount={maxErrorCount} rank={idx} />
            ))}
            {errors.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No errors in the last 5 minutes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Latency Heatmap + Service Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
        {/* Latency Heatmap */}
        <div className="glass-card rounded-xl p-5 lg:col-span-7 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Latency Heatmap
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-blue-500/30 border border-blue-500/20" /> &lt;50ms</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/40 border border-emerald-500/30" /> 50-200ms</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-amber-500/50 border border-amber-500/40" /> 200-500ms</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-rose-500/60 border border-rose-500/50" /> &gt;500ms</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4 overflow-x-auto pb-2">
            <div className="flex ml-[120px] text-[10px] text-gray-500 justify-between pr-1 font-mono">
              <span>2h ago</span>
              <span>1h ago</span>
              <span>Now</span>
            </div>
            {services.map((svc) => (
              <HeatmapRow key={svc.port} service={svc} />
            ))}
            {services.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No services detected.</p>
            )}
          </div>
        </div>

        {/* Service Health */}
        <div className="glass-card rounded-xl p-5 lg:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Service Health
            </h2>
          </div>
          <div className="flex-1 flex flex-col">
            {services.map((svc, idx) => (
              <ServiceHealthRow key={svc.port} service={svc} isLast={idx === services.length - 1} />
            ))}
            {services.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No services detected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function ErrorRow({ error, maxCount, rank }: { error: ErrorGroup; maxCount: number; rank: number }) {
  const pct = Math.round((error.count / maxCount) * 100);
  const isHighSeverity = rank === 0;
  const isMedSeverity = rank < 3;

  const dotColor = isHighSeverity
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
    : isMedSeverity
      ? 'bg-amber-500'
      : 'bg-gray-500';

  const textColor = isHighSeverity
    ? 'text-gray-200'
    : isMedSeverity
      ? 'text-gray-300'
      : 'text-gray-400';

  const countColor = isMedSeverity ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-400';
  const barColor = isHighSeverity ? 'bg-rose-500' : isMedSeverity ? 'bg-amber-500' : 'bg-gray-500';

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group has-tooltip relative border border-transparent hover:border-white/[0.05] cursor-default">
      <div className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-mono truncate group-hover:text-white transition-colors', textColor)}>
          {error.error_message}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className={cn('bg-gray-800/80 border border-gray-700/50 px-2 py-0.5 rounded text-[10px] font-mono', countColor)}>
          {error.count}x
        </div>
        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {/* Tooltip */}
      <div className="tooltip absolute bottom-full left-4 mb-2 z-50 w-72 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs font-mono text-gray-300 break-words whitespace-normal leading-relaxed">
        {error.error_message}
        {error.affected_paths.length > 0 && (
          <>
            <br />
            <span className="text-gray-500 mt-1 block">
              Affected: {error.affected_paths.join(', ')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const FRAMEWORK_COLORS: Record<string, string> = {
  Express: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Vite/React': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Vite: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  React: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  FastAPI: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Django: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Next.js': 'bg-white/10 text-white border-white/20',
  Rails: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_COLORS: Record<string, { dot: string; badge: string }> = {
  OK: {
    dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  WARN: {
    dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse',
    badge: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  ERROR: {
    dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    badge: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
};

function ServiceHealthRow({ service, isLast }: { service: ServiceInfo; isLast: boolean }) {
  const statusStyle = STATUS_COLORS[service.status] ?? STATUS_COLORS.OK;
  const fwColor = FRAMEWORK_COLORS[service.framework] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  const errorRate = service.log_count_5m > 0
    ? ((service.error_count_5m / service.log_count_5m) * 100).toFixed(2)
    : '0.00';
  const isWarn = service.status !== 'OK';

  return (
    <div className={cn('py-3 group', !isLast && 'border-b border-white/[0.05]')}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', statusStyle.dot)} />
          <span className="font-mono text-sm text-gray-200 group-hover:text-white transition-colors">
            localhost:{service.port}
          </span>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider', fwColor)}>
            {service.framework}
          </span>
        </div>
        <div className={cn('text-xs font-medium px-2 py-0.5 rounded border', statusStyle.badge)}>
          {service.status}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Requests</div>
          <div className="text-sm font-mono text-gray-300">{service.log_count_5m}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Errors</div>
          <div className={cn('text-sm font-mono', isWarn ? 'text-amber-500' : 'text-gray-300')}>{errorRate}%</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">p95 Latency</div>
          <div className="text-sm font-mono text-gray-300">--</div>
        </div>
      </div>
    </div>
  );
}

/** Generates a placeholder heatmap row. The real data would come from a latency timeseries API. */
function HeatmapRow({ service }: { service: ServiceInfo }) {
  // Generate 24 cells as placeholder (would use real heatmap data from API)
  const cells = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 24; i++) {
      // Use a deterministic seed from the port and index
      const seed = (service.port * 31 + i * 7) % 100;
      if (seed < 50) result.push('bg-blue-500/30 border-blue-500/10');
      else if (seed < 75) result.push('bg-emerald-500/40 border-emerald-500/20');
      else if (seed < 90) result.push('bg-amber-500/50 border-amber-500/30');
      else result.push('bg-rose-500/60 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.4)]');
    }
    return result;
  }, [service.port]);

  return (
    <div className="flex items-center gap-4 group min-w-max">
      <div
        className="w-[104px] text-xs font-mono text-gray-400 group-hover:text-gray-200 transition-colors truncate"
        title={`localhost:${service.port}`}
      >
        localhost:{service.port}
      </div>
      <div className="flex flex-1 gap-1">
        {cells.map((cellClass, i) => (
          <div
            key={i}
            className={cn(
              'w-4 sm:w-5 md:w-6 lg:flex-1 h-5 rounded-[2px] border heat-cell cursor-pointer',
              cellClass,
            )}
          />
        ))}
      </div>
    </div>
  );
}
