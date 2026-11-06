import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Activity, Blocks, Compass, LayoutGrid, Lightbulb, Monitor, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import type { AppId } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Dock tabs — the OS dock, centred in the top bar (adapted from the 21st.dev “Dock Tabs”
 * pattern: compact icon tabs, a sliding active pill, and a label on the active tab).
 * Platform destinations stay fixed; open application windows are appended after a divider.
 */

type RunState = 'closed' | 'open' | 'focused' | 'minimized'

const runStateLabel: Record<RunState, string> = { closed: '', open: 'Open', focused: 'Active', minimized: 'Minimized' }

/** Fixed platform destinations, using the existing OS workspaces and their names. */
const platformItems: { appId: AppId; short: string; icon: LucideIcon }[] = [
  { appId: 'application-studio', short: 'Studio', icon: Blocks },
  { appId: 'operations', short: 'Operations', icon: Activity },
  { appId: 'learning', short: 'Learning', icon: Lightbulb },
  { appId: 'system-explorer', short: 'Resources', icon: Compass },
]
const platformIds = new Set<AppId>(platformItems.map((p) => p.appId))
/** Has its own control in the top bar's right section. */
const excludedFromOpenList = new Set<AppId>(['settings'])

function DockTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
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

const tabBase =
  'relative flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70'

/** The sliding active pill shared by every tab, so focus moves visibly between them. */
function ActivePill() {
  const reduce = useReducedMotion()
  return (
    <motion.span
      layoutId="dock-active-pill"
      aria-hidden
      className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_oklch(0.2_0.03_220/0.25)]"
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
    />
  )
}

function RunDot({ state }: { state: RunState }) {
  if (state === 'closed' || state === 'focused') return null
  return (
    <span
      aria-hidden
      className={cn(
        'absolute bottom-0.5 left-1/2 h-[3px] -translate-x-1/2 rounded-full',
        state === 'open' ? 'w-1.5 bg-white/80' : 'w-1.5 bg-transparent ring-1 ring-white/70',
      )}
    />
  )
}

export function Dock() {
  const { windows, activateFromDock, setLauncherOpen, launcherOpen, showDesktop } = useOs()
  const runState = useRunState()
  const reduce = useReducedMotion()

  const visibleWindows = windows.filter((w) => w.status !== 'minimized')
  const onDesktop = visibleWindows.length === 0 && !launcherOpen

  // Open applications in the order they were opened; one entry per app (windows are single-instance).
  const openApps = windows
    .map((w) => w.appId)
    .filter((id, i, all) => all.indexOf(id) === i && !platformIds.has(id) && !excludedFromOpenList.has(id))
    .map((id) => getApp(id))

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-auto flex h-10 max-w-full min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-white/15 bg-white/10 p-1 no-scrollbar"
    >
      <DockTooltip label="Show desktop">
        <button type="button" aria-label="Desktop" aria-pressed={onDesktop} className={cn(tabBase, onDesktop ? 'text-foreground' : 'text-glass-dark-foreground/85 hover:bg-white/10')} onClick={showDesktop}>
          {onDesktop && <ActivePill />}
          <Monitor aria-hidden className="relative size-4" />
          {onDesktop && <span className="relative hidden md:inline">Desktop</span>}
        </button>
      </DockTooltip>

      <DockTooltip label="Applications  ⌘K">
        <button
          type="button"
          aria-label="Open launcher"
          aria-expanded={launcherOpen}
          className={cn(tabBase, launcherOpen ? 'text-foreground' : 'text-glass-dark-foreground/85 hover:bg-white/10')}
          onClick={() => setLauncherOpen(true)}
        >
          {launcherOpen && <ActivePill />}
          <LayoutGrid aria-hidden className="relative size-4" />
          {launcherOpen && <span className="relative hidden md:inline">Applications</span>}
        </button>
      </DockTooltip>

      {platformItems.map(({ appId, short, icon: Icon }) => {
        const state = runState(appId)
        const active = state === 'focused' && !launcherOpen
        const name = getApp(appId).name
        const label = state === 'closed' ? name : `${name} · ${runStateLabel[state]}`
        return (
          <DockTooltip key={appId} label={label}>
            <button
              type="button"
              aria-label={label}
              data-dock-app={appId}
              className={cn(tabBase, active ? 'text-foreground' : 'text-glass-dark-foreground/85 hover:bg-white/10')}
              onClick={() => activateFromDock(appId)}
            >
              {active && <ActivePill />}
              <Icon aria-hidden className="relative size-4" />
              {active && <span className="relative hidden md:inline">{short}</span>}
              <RunDot state={state} />
            </button>
          </DockTooltip>
        )
      })}

      <AnimatePresence initial={false}>
        {openApps.length > 0 && (
          <motion.span
            key="divider"
            aria-hidden
            className="mx-1 h-5 w-px shrink-0 bg-white/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
          />
        )}
        {openApps.map((app) => {
          const state = runState(app.id)
          const active = state === 'focused' && !launcherOpen
          const label = `${app.name} · ${runStateLabel[state]}`
          return (
            <motion.div
              key={app.id}
              className="shrink-0"
              initial={reduce ? false : { opacity: 0, scale: 0.6, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: 'auto' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, width: 0 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <DockTooltip label={label}>
                <button type="button" aria-label={label} data-dock-app={app.id} className={cn(tabBase, 'px-1.5', !active && 'hover:bg-white/10')} onClick={() => activateFromDock(app.id)}>
                  {active && <ActivePill />}
                  <AppIcon app={app} size="xs" className={cn('relative', state === 'minimized' && 'opacity-70')} />
                  <RunDot state={state} />
                </button>
              </DockTooltip>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </nav>
  )
}
