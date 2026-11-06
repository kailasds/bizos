import { useState, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A section that stays collapsed until the user asks for it. */
export function Expander({
  title,
  icon: Icon,
  meta,
  defaultOpen = false,
  children,
  className,
}: {
  title: string
  icon?: LucideIcon
  meta?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section aria-label={title} className={cn('rounded-2xl border bg-card', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {Icon && (
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-3.5" />
          </span>
        )}
        <span className="text-sm font-semibold">{title}</span>
        {meta && <span className="min-w-0 truncate text-xs text-muted-foreground">{meta}</span>}
        <ChevronDown aria-hidden className={cn('ml-auto size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-6 border-t px-4 py-4">{children}</div>}
    </section>
  )
}
