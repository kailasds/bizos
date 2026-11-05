import { useEffect, useState } from 'react'
import { Hexagon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import { MockBadge } from '@/components/os/MockBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return <time className="tabular-nums">{clockFormat.format(now)}</time>
}

export function TopBar() {
  const { windows, focusedId } = useOs()
  const focused = windows.find((w) => w.id === focusedId)

  return (
    <header className="relative z-20 flex h-9 shrink-0 items-center gap-3 border-b border-border/70 bg-card/80 px-4 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <span className="flex size-5 items-center justify-center rounded-[5px] bg-foreground text-background">
          <Hexagon className="size-3" />
        </span>
        <span className="hidden sm:inline">Enterprise AI OS</span>
      </div>
      <span aria-hidden className="h-4 w-px bg-border" />
      <span className="min-w-0 truncate text-muted-foreground" aria-live="polite">
        {focused ? getApp(focused.appId).name : 'Desktop'}
      </span>
      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <MockBadge label="Prototype · mock data" className="hidden sm:inline-flex" />
              <MockBadge className="sm:hidden" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            Phase 1 desktop prototype. Applications, metrics and activity are fabricated sample data — nothing here is live.
          </TooltipContent>
        </Tooltip>
        <span className="hidden sm:inline">
          <Clock />
        </span>
      </div>
    </header>
  )
}
