import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, onClick }: GlassCardProps) {
  return (
    <div
      className={cn('glass-card rounded-xl p-6', hover && 'cursor-default', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
