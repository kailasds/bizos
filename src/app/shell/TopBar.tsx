import type { ReactNode } from 'react'
import { Bell, Hexagon, Settings, Sparkles } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Dock } from './Dock'
import { QuickCreate } from './QuickCreate'
import { NotificationCenter } from './NotificationCenter'

const barButton =
  'relative flex size-9 shrink-0 items-center justify-center rounded-full text-glass-dark-foreground/90 outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 aria-expanded:bg-white/20 aria-pressed:bg-white/20'

function BarTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The top bar keeps its left (identity, focused app) and right (status, clock) sections;
 * the dock sits in the centre. Assistant, notifications and settings moved here from the old
 * bottom dock, unchanged in behaviour.
 */
export function TopBar() {
  const { windows, focusedId, assistantOpen, setAssistantOpen, notificationsOpen, setNotificationsOpen, unreadCount, activateFromDock } = useOs()
  const focused = windows.find((w) => w.id === focusedId && w.status !== 'minimized')
  const settingsWin = windows.find((w) => w.appId === 'settings')
  const settingsLabel = !settingsWin ? 'Settings' : settingsWin.status === 'minimized' ? 'Settings · Minimized' : settingsWin.id === focusedId ? 'Settings · Active' : 'Settings · Open'

  return (
    <header className="glass-dark relative z-20 flex h-[4.5rem] shrink-0 items-center gap-2 border-b border-white/10 px-2 text-sm md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3 md:px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2 md:shrink">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-primary shadow-sm">
          <Hexagon className="size-4" />
        </span>
        <span className="hidden text-[15px] font-semibold whitespace-nowrap lg:inline">Enterprise AI OS</span>
        <span aria-hidden className="hidden h-4 w-px bg-white/25 xl:block" />
        <span className="hidden min-w-0 truncate text-glass-dark-foreground/85 xl:inline" aria-live="polite">
          {focused ? getApp(focused.appId).name : 'Desktop'}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 md:max-w-[min(60rem,64vw)]">
        <Dock />
        <QuickCreate />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 text-glass-dark-foreground md:gap-1.5">
        <button
          type="button"
          aria-label="Assistant"
          aria-pressed={assistantOpen}
          onClick={() => setAssistantOpen(!assistantOpen)}
          className={cn(
            'mr-1 flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/80 md:px-4',
            assistantOpen
              ? 'bg-primary text-primary-foreground shadow-[0_0_0_3px_oklch(1_0_0/0.25)]'
              : 'bg-white text-primary shadow-[0_4px_14px_-4px_oklch(0.55_0.14_248/0.6)] hover:bg-white/90',
          )}
        >
          <Sparkles aria-hidden className="size-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button type="button" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} className={barButton}>
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              Notifications
            </TooltipContent>
          </Tooltip>
          <NotificationCenter />
        </Popover>
        <BarTooltip label={settingsLabel}>
          <button type="button" aria-label={settingsLabel} data-dock-app="settings" className={cn(barButton, settingsWin?.id === focusedId && settingsWin?.status !== 'minimized' && 'bg-white/20')} onClick={() => activateFromDock('settings')}>
            <Settings className="size-4" />
          </button>
        </BarTooltip>
      </div>
    </header>
  )
}
