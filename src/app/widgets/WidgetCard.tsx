import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface WidgetCardProps {
  icon: LucideIcon
  title: string
  /** Accessible description of where the card leads, e.g. "Open System Explorer — Workers". */
  openLabel: string
  onOpen: () => void
  aside?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * The whole card opens its detail view (stretched header button). Inner controls
 * that need their own action must use `relative z-10` to sit above the stretch.
 */
export function WidgetCard({ icon: Icon, title, openLabel, onOpen, aside, children, className }: WidgetCardProps) {
  return (
    <section
      className={cn(
        'group/widget widget-glass relative rounded-[22px] p-3.5 has-[>header>button:focus-visible]:ring-3 has-[>header>button:focus-visible]:ring-ring/50',
        className,
      )}
    >
      <header className="flex items-center gap-2">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-[22px]"
        >
          {title}
        </button>
        <div className="ml-auto flex items-center gap-1">
          {aside}
          <ChevronRight aria-hidden className="size-4 text-muted-foreground/60 group-hover/widget:text-foreground" />
        </div>
      </header>
      <div className="mt-2">{children}</div>
    </section>
  )
}
