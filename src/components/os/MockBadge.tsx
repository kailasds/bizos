import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Marks a surface whose data is fabricated for the Phase 1 prototype. */
export function MockBadge({ className, label = 'Mock data' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-foreground/10 bg-glass-strong px-2 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <FlaskConical aria-hidden className="size-3" />
      {label}
    </span>
  )
}
