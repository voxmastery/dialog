import { cn } from '@/lib/utils';
import type { LogLevel } from '@/lib/types';

const LEVEL_STYLES: Record<string, string> = {
  DEBUG: 'bg-[rgba(138,138,150,0.15)] text-[#8A8A96]',
  INFO: 'bg-[rgba(255,255,255,0.15)] text-white',
  WARN: 'bg-[rgba(245,184,61,0.15)] text-[#F5B83D]',
  ERROR: 'bg-[rgba(230,69,83,0.15)] text-[#E64553]',
  FATAL: 'bg-[rgba(255,42,42,0.2)] text-[#FF2A2A]',
};

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-[rgba(66,211,146,0.15)] text-[#42D392]',
  POST: 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]',
  PUT: 'bg-[rgba(251,146,60,0.15)] text-[#FB923C]',
  DELETE: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]',
  PATCH: 'bg-[rgba(251,146,60,0.15)] text-[#FB923C]',
};

export function LevelBadge({ level }: { level: LogLevel | string | null }) {
  if (!level) return null;
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-medium', LEVEL_STYLES[level] ?? LEVEL_STYLES.INFO)}>
      {level}
    </span>
  );
}

export function MethodBadge({ method }: { method: string | null }) {
  if (!method) return null;
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-medium', METHOD_STYLES[method] ?? METHOD_STYLES.GET)}>
      {method}
    </span>
  );
}

export function StatusBadge({ status }: { status: number | null }) {
  if (status === null) return null;
  const color = status >= 500 ? 'text-red-400' : status >= 400 ? 'text-yellow-400' : 'text-emerald-400';
  return <span className={cn('font-mono text-sm', color)}>{status}</span>;
}

export function FrameworkBadge({ framework }: { framework: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      {framework}
    </span>
  );
}
