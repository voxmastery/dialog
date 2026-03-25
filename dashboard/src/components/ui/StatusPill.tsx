import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  OK: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  WARN: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ERROR: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10' },
  UNKNOWN: { dot: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-500/10' },
} as const;

export function StatusPill({ status, label }: { status: keyof typeof STATUS_STYLES; label?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot, status === 'OK' && 'animate-pulse')} />
      {label ?? status}
    </div>
  );
}
