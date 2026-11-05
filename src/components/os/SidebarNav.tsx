import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SidebarNavItem<T extends string> {
  id: T
  label: string
  icon: LucideIcon
  meta?: ReactNode
}

/** In-app section navigation: a sidebar on wide windows, a scrolling chip row on narrow ones. */
export function SidebarNav<T extends string>({
  label,
  items,
  value,
  onChange,
  footer,
}: {
  label: string
  items: SidebarNavItem<T>[]
  value: T
  onChange: (id: T) => void
  footer?: ReactNode
}) {
  return (
    <nav
      aria-label={label}
      className="flex shrink-0 gap-1 overflow-x-auto border-b bg-chrome p-2 no-scrollbar @3xl:w-52 @3xl:flex-col @3xl:overflow-visible @3xl:border-r @3xl:border-b-0 @3xl:p-3"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 @3xl:w-full',
              active ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.meta && <span className="hidden text-xs text-muted-foreground @3xl:inline">{item.meta}</span>}
          </button>
        )
      })}
      {footer && <div className="mt-auto hidden px-1 pt-3 @3xl:block">{footer}</div>}
    </nav>
  )
}
