import { useState, useMemo } from 'react';
import { useErrors } from '@/hooks/useErrors';
import { useLatency } from '@/hooks/useMetrics';
import { GlassCard } from '@/components/ui/GlassCard';
import type { ErrorGroup, LatencyMetrics } from '@/lib/types';

type TimeRange = 'last-deploy' | '1h' | 'custom';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  'last-deploy': 'Last deploy',
  '1h': '1h before / 1h after',
  custom: 'Custom',
};

interface MetricCardProps {
  readonly label: string;
  readonly beforeValue: string;
  readonly afterValue: string;
  readonly changePercent: number;
  readonly changeDirection: 'up' | 'down' | 'flat';
  readonly severity: 'danger' | 'warning' | 'neutral';
  readonly sparklinePath: string;
  readonly sparklineColor: string;
}

function MetricCard({
  label,
  beforeValue,
  afterValue,
  changePercent,
  changeDirection,
  severity,
  sparklinePath,
  sparklineColor,
}: MetricCardProps) {
  const changeColor =
    severity === 'danger'
      ? 'text-rose-500'
      : severity === 'warning'
        ? 'text-amber-500'
        : 'text-gray-500';

  const afterColor =
    severity === 'danger'
      ? 'text-rose-500'
      : severity === 'warning'
        ? 'text-amber-500'
        : 'text-white';

  return (
    <GlassCard className="p-5 relative overflow-hidden" hover={false}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${changeColor} flex items-center gap-0.5`}>
          {changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : '—'} {Math.abs(changePercent)}%
          {changeDirection !== 'flat' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {changeDirection === 'up' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7 7 7M12 3v18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7-7-7M12 21V3" />
              )}
            </svg>
          )}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-500">Before:</span>
            <span className="text-lg font-semibold text-blue-400">{beforeValue}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${severity === 'danger' ? 'bg-rose-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-white'}`} />
            <span className="text-sm text-gray-500">After:</span>
            <span className={`text-2xl font-bold ${afterColor}`}>{afterValue}</span>
          </div>
        </div>
        <div className="w-24 h-12 opacity-30">
          <svg viewBox="0 0 100 40" className="w-full h-full">
            <path d={sparklinePath} fill="none" stroke={sparklineColor} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </GlassCard>
  );
}

type Verdict = 'IMPROVED' | 'DEGRADED' | 'STABLE';

interface VerdictBannerProps {
  readonly verdict: Verdict;
  readonly description: string;
}

function VerdictBanner({ verdict, description }: VerdictBannerProps) {
  const styles: Record<Verdict, { bg: string; border: string; icon: string; title: string; textColor: string; descColor: string }> = {
    DEGRADED: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: 'text-rose-500',
      title: 'text-rose-500',
      textColor: 'text-rose-500',
      descColor: 'text-rose-200/70',
    },
    IMPROVED: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-500',
      title: 'text-emerald-500',
      textColor: 'text-emerald-500',
      descColor: 'text-emerald-200/70',
    },
    STABLE: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-500',
      title: 'text-blue-500',
      textColor: 'text-blue-500',
      descColor: 'text-blue-200/70',
    },
  };

  const s = styles[verdict];

  return (
    <div className={`w-full ${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-4 relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${verdict === 'DEGRADED' ? 'from-rose-500/5' : verdict === 'IMPROVED' ? 'from-emerald-500/5' : 'from-blue-500/5'} to-transparent`} />
      <div className={`w-10 h-10 rounded-lg ${verdict === 'DEGRADED' ? 'bg-rose-500/20 border-rose-500/40' : verdict === 'IMPROVED' ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-blue-500/20 border-blue-500/40'} flex items-center justify-center shrink-0 border`}>
        <svg className={`w-6 h-6 ${s.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {verdict === 'DEGRADED' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          ) : verdict === 'IMPROVED' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
          )}
        </svg>
      </div>
      <div>
        <h3 className={`${s.title} font-bold text-lg leading-none`}>{verdict}</h3>
        <p className={`${s.descColor} text-sm mt-1 font-medium`}>{description}</p>
      </div>
    </div>
  );
}

interface ErrorListItemProps {
  readonly message: string;
  readonly count: number;
  readonly isNew: boolean;
}

function NewErrorItem({ message, count }: ErrorListItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.04] group cursor-pointer border border-transparent hover:border-rose-500/10 transition-all">
      <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-mono text-gray-200 truncate group-hover:text-white transition-colors">
          {message}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">NEW</span>
        <span className="text-xs font-mono text-gray-400">{count}x</span>
      </div>
    </div>
  );
}

function ResolvedErrorItem({ message, count }: ErrorListItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.04] group cursor-pointer border border-transparent hover:border-emerald-500/10 transition-all">
      <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
        <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-mono text-gray-400 truncate group-hover:text-gray-200 transition-colors">
          {message}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
          Resolved
        </span>
        <span className="text-xs font-mono text-gray-500">Was {count}x</span>
      </div>
    </div>
  );
}

export function DeploymentsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('last-deploy');
  const [selectedService, setSelectedService] = useState('all');

  // Fetch before/after data using different time params
  const serviceParam = selectedService === 'all' ? undefined : selectedService;
  const { data: errorsBefore } = useErrors({ last: '2h', service: serviceParam });
  const { data: errorsAfter } = useErrors({ last: '1h', service: serviceParam });
  const { data: latencyBefore } = useLatency({ last: '2h', service: serviceParam });
  const { data: latencyAfter } = useLatency({ last: '1h', service: serviceParam });

  // Compute metrics
  const metrics = useMemo(() => {
    const beforeErrorRate = errorsBefore?.total ?? 0;
    const afterErrorRate = errorsAfter?.total ?? 0;
    const errorRateChange = beforeErrorRate > 0 ? Math.round(((afterErrorRate - beforeErrorRate) / beforeErrorRate) * 100) : 0;

    const beforeLatency = latencyBefore?.avg_ms ?? 0;
    const afterLatency = latencyAfter?.avg_ms ?? 0;
    const latencyChange = beforeLatency > 0 ? Math.round(((afterLatency - beforeLatency) / beforeLatency) * 100) : 0;

    return { beforeErrorRate, afterErrorRate, errorRateChange, beforeLatency, afterLatency, latencyChange };
  }, [errorsBefore, errorsAfter, latencyBefore, latencyAfter]);

  // Determine verdict
  const verdict: Verdict = useMemo(() => {
    if (metrics.errorRateChange > 50) return 'DEGRADED';
    if (metrics.errorRateChange < -20) return 'IMPROVED';
    return 'STABLE';
  }, [metrics.errorRateChange]);

  // Categorize errors as new or resolved
  const { newErrors, resolvedErrors } = useMemo(() => {
    const beforeMessages = new Set(
      (errorsBefore?.errors ?? []).map((e: ErrorGroup) => e.error_message),
    );
    const afterMessages = new Set(
      (errorsAfter?.errors ?? []).map((e: ErrorGroup) => e.error_message),
    );

    const newErrs = (errorsAfter?.errors ?? []).filter(
      (e: ErrorGroup) => !beforeMessages.has(e.error_message),
    );
    const resolvedErrs = (errorsBefore?.errors ?? []).filter(
      (e: ErrorGroup) => !afterMessages.has(e.error_message),
    );

    return { newErrors: newErrs, resolvedErrors: resolvedErrs };
  }, [errorsBefore, errorsAfter]);

  const verdictDescription = useMemo(() => {
    if (verdict === 'DEGRADED') {
      return `Error rate increased ${Math.abs(metrics.errorRateChange)}%, ${newErrors.length} new errors detected after deployment`;
    }
    if (verdict === 'IMPROVED') {
      return `Error rate decreased ${Math.abs(metrics.errorRateChange)}%, ${resolvedErrors.length} errors resolved after deployment`;
    }
    return 'No significant changes detected after deployment';
  }, [verdict, metrics.errorRateChange, newErrors.length, resolvedErrors.length]);

  return (
    <div className="flex flex-col gap-6">
      {/* Time range selector */}
      <GlassCard className="p-6 flex flex-col gap-6" hover={false}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Deployment Comparison</h2>
            <div className="flex gap-1">
              {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                    timeRange === range
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {TIME_RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded px-3 py-1.5 outline-none"
            >
              <option value="all">All Services</option>
              <option value="api-gateway">api-gateway</option>
            </select>
          </div>
        </div>

        {/* Timeline track */}
        <div className="relative pt-8 pb-4 px-4">
          <div
            className="h-10 w-full rounded-lg relative border border-white/5 overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 45%, rgba(168, 85, 247, 0.15) 55%, rgba(168, 85, 247, 0.15) 100%)',
            }}
          >
            <div className="absolute inset-y-0 left-0 w-[45%] bg-blue-500/10 border-r border-blue-500/30" />
            <div className="absolute inset-y-0 right-0 w-[45%] bg-purple-500/10 border-l border-purple-500/30" />
            <div className="absolute inset-y-0 left-1/2 w-px border-l-2 border-dashed border-white/40 z-10 flex flex-col items-center">
              <div className="absolute -top-7 bg-white/10 p-1 rounded border border-white/20">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-[10px] text-gray-600 font-mono">
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00 (Deploy)</span>
              <span>20:00</span>
              <span>22:00</span>
            </div>
          </div>
          <div className="absolute top-4 left-[45%] -ml-3 cursor-grab flex flex-col items-center">
            <div className="text-[10px] font-bold text-blue-400 mb-1">BEFORE</div>
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full" />
            </div>
          </div>
          <div className="absolute top-4 left-[55%] -ml-3 cursor-grab flex flex-col items-center">
            <div className="text-[10px] font-bold text-purple-400 mb-1">AFTER</div>
            <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full" />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Verdict banner */}
      <VerdictBanner verdict={verdict} description={verdictDescription} />

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Error Rate"
          beforeValue={`${metrics.beforeErrorRate}`}
          afterValue={`${metrics.afterErrorRate}`}
          changePercent={Math.abs(metrics.errorRateChange)}
          changeDirection={metrics.errorRateChange > 0 ? 'up' : metrics.errorRateChange < 0 ? 'down' : 'flat'}
          severity={metrics.errorRateChange > 100 ? 'danger' : metrics.errorRateChange > 30 ? 'warning' : 'neutral'}
          sparklinePath="M0 35 L30 32 L60 38 L100 5"
          sparklineColor="#F43F5E"
        />
        <MetricCard
          label="Avg Latency"
          beforeValue={`${Math.round(metrics.beforeLatency)}ms`}
          afterValue={`${Math.round(metrics.afterLatency)}ms`}
          changePercent={Math.abs(metrics.latencyChange)}
          changeDirection={metrics.latencyChange > 0 ? 'up' : metrics.latencyChange < 0 ? 'down' : 'flat'}
          severity={metrics.latencyChange > 40 ? 'warning' : 'neutral'}
          sparklinePath="M0 30 L30 28 L60 20 L100 5"
          sparklineColor="#F59E0B"
        />
        <MetricCard
          label="Request Volume"
          beforeValue="--"
          afterValue="--"
          changePercent={0}
          changeDirection="flat"
          severity="neutral"
          sparklinePath="M0 10 L30 15 L60 12 L100 25"
          sparklineColor="white"
        />
      </div>

      {/* Error lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New errors */}
        <GlassCard className="p-0 overflow-hidden flex flex-col" hover={false}>
          <div className="px-5 py-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-rose-500 rounded-sm" />
              <h3 className="font-semibold text-white">New Errors</h3>
            </div>
            <span className="text-xs font-bold text-rose-500 px-2 py-1 bg-rose-500/20 rounded">
              {newErrors.length} New Type{newErrors.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {newErrors.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No new errors detected</div>
            ) : (
              newErrors.map((err) => (
                <NewErrorItem
                  key={err.error_message}
                  message={err.error_message}
                  count={err.count}
                  isNew
                />
              ))
            )}
          </div>
        </GlassCard>

        {/* Resolved errors */}
        <GlassCard className="p-0 overflow-hidden flex flex-col" hover={false}>
          <div className="px-5 py-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-emerald-500 rounded-sm" />
              <h3 className="font-semibold text-white">Resolved Errors</h3>
            </div>
            <span className="text-xs font-bold text-emerald-500 px-2 py-1 bg-emerald-500/20 rounded">
              {resolvedErrors.length} Fixed
            </span>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {resolvedErrors.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No resolved errors</div>
            ) : (
              resolvedErrors.map((err) => (
                <ResolvedErrorItem
                  key={err.error_message}
                  message={err.error_message}
                  count={err.count}
                  isNew={false}
                />
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Latency distribution */}
      <GlassCard className="p-6 flex flex-col" hover={false}>
        <h3 className="text-base font-semibold text-white mb-6">Latency Distribution Comparison</h3>
        <div className="relative flex-1 min-h-[280px]">
          <svg viewBox="0 0 1000 300" className="w-full h-[240px]" preserveAspectRatio="none">
            <path d="M0 300 Q100 280 150 150 T250 80 T350 200 T500 280 T1000 300" fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="2" />
            <path d="M0 300 Q100 290 150 180 T250 120 T350 100 T500 150 T700 220 T1000 300" fill="rgba(168, 85, 247, 0.15)" stroke="#A855F7" strokeWidth="2" />

            <g className="font-mono text-[10px] fill-gray-500">
              <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />
              <text x="205" y="15">p50: {latencyAfter?.p50_ms ?? '--'}ms</text>

              <line x1="550" y1="0" x2="550" y2="300" stroke="rgba(244,63,94,0.4)" strokeDasharray="4" strokeWidth="1.5" />
              <text x="555" y="15" className="fill-rose-400">p95: {latencyAfter?.p95_ms ?? '--'}ms</text>

              <line x1="850" y1="0" x2="850" y2="300" stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />
              <text x="855" y="15">p99: {latencyAfter?.p99_ms ?? '--'}ms</text>
            </g>

            <path d="M480 300 L480 230 Q600 150 700 220 T1000 300 Z" fill="rgba(244, 63, 94, 0.1)" />
          </svg>

          <div className="flex justify-between mt-4 text-[11px] font-mono text-gray-500 border-t border-white/5 pt-3">
            <span>0ms</span>
            <span>100ms</span>
            <span>200ms</span>
            <span>300ms</span>
            <span>400ms</span>
            <span>500ms+</span>
          </div>

          <div className="flex items-center gap-6 mt-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-xs text-gray-400">Before Deployment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-xs text-gray-400">After Deployment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500/40" />
              <span className="text-xs text-rose-400">Latency Degradation</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
