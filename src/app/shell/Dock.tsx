import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Activity, Blocks, Compass, House, LayoutGrid, Lightbulb, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppId } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Floating dock in the top bar (after the 21st.dev “Floating Dock” style): icon tiles that
 * magnify with pointer proximity and show their name on hover; the active item expands into a
 * pill with its name. Platform destinations are fixed; open applications follow a divider.
 */

type RunState = 'closed' | 'open' | 'focused' | 'minimized'
const runStateLabel: Record<RunState, string> = { closed: '', open: 'Open', focused: 'Active', minimized: 'Minimized' }

const platformItems: { appId: AppId; short: string; icon: LucideIcon }[] = [
  { appId: 'application-studio', short: 'Studio', icon: Blocks },
  { appId: 'operations', short: 'Operations', icon: Activity },
  { appId: 'learning', short: 'Learning', icon: Lightbulb },
  { appId: 'system-explorer', short: 'Resources', icon: Compass },
]
const platformIds = new Set<AppId>(platformItems.map((p) => p.appId))
const excludedFromOpenList = new Set<AppId>(['settings'])

const BASE = 40
const MAX = 52

function useRunState() {
  const { windows, focusedId } = useOs()
  return (appId: AppId): RunState => {
    const win = windows.find((w) => w.appId === appId)
    if (!win) return 'closed'
    if (win.status === 'minimized') return 'minimized'
    return win.id === focusedId ? 'focused' : 'open'
  }
}

interface ItemProps {
  mouseX: MotionValue<number>
  label: string
  name: string
  active: boolean
  state?: RunState
  icon: ReactNode
  dockApp?: AppId
  pressed?: boolean
  expanded?: boolean
  onClick: () => void
}

/** One dock tile. Magnifies with pointer distance; shows the name on hover, or inline when active. */
function DockItem({ mouseX, label, name, active, state = 'closed', icon, dockApp, pressed, expanded, onClick }: ItemProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduce = useReducedMotion()
  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect()
    return r ? x - r.left - r.width / 2 : Infinity
  })
  const raw = useTransform(distance, [-120, 0, 120], [BASE, MAX, BASE])
  const size = useSpring(raw, { mass: 0.1, stiffness: 160, damping: 13 })
  const iconScale = useTransform(size, [BASE, MAX], [1, 1.22])

  const button = (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      data-dock-app={dockApp}
      onClick={onClick}
      style={reduce ? { height: BASE, minWidth: BASE } : { height: size, minWidth: size }}
      className={cn(
        'relative flex shrink-0 items-center justify-center gap-2 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/80',
        active ? 'bg-white px-3.5 text-foreground shadow-[0_2px_8px_oklch(0.15_0.03_250/0.25)]' : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      <motion.span style={reduce ? undefined : { scale: iconScale }} className="flex items-center justify-center">
        {icon}
      </motion.span>
      {active && <span className="pr-0.5 text-sm font-semibold whitespace-nowrap">{name}</span>}
      {(state === 'open' || state === 'minimized') && (
        <span aria-hidden className={cn('absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full', state === 'open' ? 'bg-white' : 'bg-white/45')} />
      )}
    </motion.button>
  )
  if (active) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={10}>
        {name}
      </TooltipContent>
    </Tooltip>
  )
}

export function Dock() {
  const { windows, activateFromDock, setLauncherOpen, launcherOpen, showDesktop } = useOs()
  const runState = useRunState()
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(Infinity)

  const onDesktop = windows.every((w) => w.status === 'minimized') && !launcherOpen
  const openApps: AppDefinition[] = windows
    .map((w) => w.appId)
    .filter((id, i, all) => all.indexOf(id) === i && !platformIds.has(id) && !excludedFromOpenList.has(id))
    .map((id) => getApp(id))

  return (
    <nav
      aria-label="Dock"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="pointer-events-auto flex h-14 max-w-full min-w-0 items-center gap-2 overflow-x-auto rounded-full border border-white/20 bg-white/12 px-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_6px_20px_-6px_oklch(0.15_0.03_250/0.45)] backdrop-blur-xl no-scrollbar"
    >
      <DockItem mouseX={mouseX} label="Home" name="Home" active={onDesktop} pressed={onDesktop} icon={<House aria-hidden className="size-[18px]" />} onClick={showDesktop} />
      <DockItem
        mouseX={mouseX}
        label="Open launcher"
        name="Applications"
        active={launcherOpen}
        expanded={launcherOpen}
        icon={<LayoutGrid aria-hidden className="size-[18px]" />}
        onClick={() => setLauncherOpen(true)}
      />
      {platformItems.map(({ appId, short, icon: Icon }) => {
        const state = runState(appId)
        const name = getApp(appId).name
        return (
          <DockItem
            key={appId}
            mouseX={mouseX}
            label={state === 'closed' ? name : `${name} · ${runStateLabel[state]}`}
            name={short}
            active={state === 'focused' && !launcherOpen}
            state={state}
            dockApp={appId}
            icon={<Icon aria-hidden className="size-[18px]" />}
            onClick={() => activateFromDock(appId)}
          />
        )
      })}

      <AnimatePresence initial={false}>
        {openApps.length > 0 && (
          <motion.span key="divider" aria-hidden className="mx-0.5 h-7 w-px shrink-0 bg-white/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15 }} />
        )}
        {openApps.map((app) => {
          const state = runState(app.id)
          return (
            <motion.div
              key={app.id}
              className="flex shrink-0 items-center"
              initial={reduce ? false : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <DockItem
                mouseX={mouseX}
                label={`${app.name} · ${runStateLabel[state]}`}
                name={app.name}
                active={state === 'focused' && !launcherOpen}
                state={state}
                dockApp={app.id}
                icon={<AppIcon app={app} size="sm" className={cn('size-7 rounded-full', state === 'minimized' && 'opacity-70')} />}
                onClick={() => activateFromDock(app.id)}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </nav>
  )
}
