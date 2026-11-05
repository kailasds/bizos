import type { ReactNode } from 'react'
import { Bell, LayoutGrid, Settings, Sparkles } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp, pinnedApps } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppId } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { NotificationCenter } from './NotificationCenter'

type RunState = 'closed' | 'open' | 'focused' | 'minimized'

const runStateLabel: Record<RunState, string> = {
  closed: '',
  open: 'Open',
  focused: 'Active',
  minimized: 'Minimized',
}

function RunIndicator({ state }: { state: RunState }) {
  if (state === 'closed') return null
  return (
    <span
      aria-hidden
      className={cn(
        'absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full',
        state === 'focused' && 'h-1 w-4 bg-primary',
        state === 'open' && 'size-1 bg-muted-foreground',
        state === 'minimized' && 'size-1.5 bg-transparent ring-1 ring-muted-foreground',
      )}
    />
  )
}

const dockButton =
  'relative flex size-11 shrink-0 items-center justify-center rounded-lg pb-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-pressed:bg-muted'

function DockTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function useRunState() {
  const { windows, focusedId } = useOs()
  return (appId: AppId): RunState => {
    const win = windows.find((w) => w.appId === appId)
    if (!win) return 'closed'
    if (win.status === 'minimized') return 'minimized'
    return win.id === focusedId ? 'focused' : 'open'
  }
}

function AppDockItem({ app, state, className }: { app: AppDefinition; state: RunState; className?: string }) {
  const { activateFromDock } = useOs()
  const label = state === 'closed' ? app.name : `${app.name} · ${runStateLabel[state]}`
  return (
    <DockTooltip label={label}>
      <button type="button" aria-label={label} className={cn(dockButton, className)} onClick={() => activateFromDock(app.id)}>
        <AppIcon app={app} size="md" className={cn(state === 'minimized' && 'opacity-70')} />
        <RunIndicator state={state} />
      </button>
    </DockTooltip>
  )
}

export function Dock() {
  const {
    windows,
    activateFromDock,
    setLauncherOpen,
    assistantOpen,
    setAssistantOpen,
    notificationsOpen,
    setNotificationsOpen,
    unreadCount,
  } = useOs()
  const runState = useRunState()

  // Running windows that are not pinned and not a system item (e.g. the folder browser).
  const transient = windows
    .map((w) => getApp(w.appId))
    .filter((app) => !app.pinned && app.id !== 'settings')

  const settingsState = runState('settings')

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-auto mx-auto flex h-15 max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border bg-card/95 px-2 shadow-dock no-scrollbar"
    >
      <DockTooltip label="Launcher  ⌘K">
        <button type="button" aria-label="Open launcher" className={dockButton} onClick={() => setLauncherOpen(true)}>
          <span className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
            <LayoutGrid className="size-5" />
          </span>
        </button>
      </DockTooltip>

      <Separator orientation="vertical" className="mx-1 my-3" />

      {pinnedApps.map((app) => (
        // On phones, closed pinned apps live on the desktop and in the launcher only.
        <AppDockItem key={app.id} app={app} state={runState(app.id)} className={runState(app.id) === 'closed' ? 'hidden sm:flex' : undefined} />
      ))}

      {transient.length > 0 && <Separator orientation="vertical" className="mx-1 my-3" />}
      {transient.map((app) => (
        <AppDockItem key={app.id} app={app} state={runState(app.id)} />
      ))}

      <Separator orientation="vertical" className="mx-1 my-3" />

      <DockTooltip label="Assistant">
        <button
          type="button"
          aria-label="Assistant"
          aria-pressed={assistantOpen}
          className={dockButton}
          onClick={() => setAssistantOpen(!assistantOpen)}
        >
          <Sparkles className="size-5 text-foreground" />
          <RunIndicator state={assistantOpen ? 'focused' : 'closed'} />
        </button>
      </DockTooltip>

      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                className={dockButton}
              >
                <Bell className="size-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Notifications
          </TooltipContent>
        </Tooltip>
        <NotificationCenter />
      </Popover>

      <DockTooltip label={settingsState === 'closed' ? 'Settings' : `Settings · ${runStateLabel[settingsState]}`}>
        <button
          type="button"
          aria-label="Settings"
          className={dockButton}
          onClick={() => activateFromDock('settings')}
        >
          <Settings className="size-5 text-foreground" />
          <RunIndicator state={settingsState} />
        </button>
      </DockTooltip>
    </nav>
  )
}
