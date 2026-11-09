import { useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { Activity, Blocks, Compass, House, LayoutGrid, Lightbulb, X, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppId } from '@/app/registry/types'
import type { WindowState } from '@/app/windows/windowReducer'
import { AppIcon } from '@/components/os/AppIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Dock in the top bar. Tiles keep a fixed size (no pointer magnification: resizing tiles moved their
 * neighbours under the cursor and made the bar shiver). Running apps carry a lit bar beneath the
 * tile; hovering one shows a live preview of each of its windows. Minimized windows fly into their
 * tile, which acknowledges them with a small bounce.
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

function useRunState() {
  const { windows, focusedId } = useOs()
  return (appId: AppId): RunState => {
    const wins = windows.filter((w) => w.appId === appId)
    if (wins.length === 0) return 'closed'
    if (wins.some((w) => w.id === focusedId && w.status !== 'minimized')) return 'focused'
    return wins.every((w) => w.status === 'minimized') ? 'minimized' : 'open'
  }
}

const PREVIEW_W = 232
const PREVIEW_H = 144

/**
 * A live miniature of a window: a static copy of its current DOM, scaled down. The copy carries no
 * React handlers, ids or accessible names, so it can't be operated or confused with the real window.
 */
function WindowSnapshot({ windowId }: { windowId: string }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-window-id="${CSS.escape(windowId)}"]`)
    const box = host.current
    if (!target || !box) return
    const width = target.offsetWidth || 1
    const height = target.offsetHeight || 1
    const scale = Math.min(PREVIEW_W / width, PREVIEW_H / height)
    const frame = document.createElement('div')
    frame.className = target.className.replace(/\bglass\b/, '')
    frame.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:0 0;visibility:visible;pointer-events:none;background:var(--card);`
    for (const child of Array.from(target.children)) frame.appendChild(child.cloneNode(true))
    frame.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
    frame.querySelectorAll('[aria-label]').forEach((el) => el.removeAttribute('aria-label'))
    box.style.width = `${Math.round(width * scale)}px`
    box.style.height = `${Math.round(height * scale)}px`
    box.replaceChildren(frame)
    return () => box.replaceChildren()
  }, [windowId])
  return <div ref={host} aria-hidden inert className="relative overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_oklch(0.2_0.02_220/0.12)]" />
}

function WindowPreviews({ app, wins, onPick, onClose }: { app: AppDefinition; wins: WindowState[]; onPick: (id: string) => void; onClose: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold">{app.name}</p>
      <ul className="flex gap-2">
        {wins.map((w, i) => {
          const name = w.title ?? (wins.length > 1 ? `Window ${i + 1}` : null)
          return (
            <li key={w.id} className="group/preview relative">
              <button
                type="button"
                onClick={() => onPick(w.id)}
                aria-label={`Show ${app.name}${name ? ` — ${name}` : ''}`}
                className="flex flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none hover:bg-white/45 focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                <WindowSnapshot windowId={w.id} />
                {name && <span className="max-w-[232px] truncate px-0.5 text-[11px] font-medium">{name}</span>}
              </button>
              <button
                type="button"
                aria-label={`Close window · ${app.name}${name ? ` — ${name}` : ''}`}
                onClick={() => onClose(w.id)}
                className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-full bg-white text-foreground opacity-0 shadow outline-none group-focus-within/preview:opacity-100 group-hover/preview:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                <X className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface ItemProps {
  label: string
  name: string
  active: boolean
  state?: RunState
  /** One entry per open window (true = minimized). */
  windowsOpen?: boolean[]
  icon: ReactNode
  dockApp?: AppId
  pressed?: boolean
  expanded?: boolean
  onClick: () => void
}

/** One dock tile: fixed size, instant hover, lit bar while running, a bounce when a window lands in it. */
type TriggerProps = Omit<ComponentPropsWithRef<'button'>, 'onClick'>

/** Extra props come from tooltip/hover-card triggers (pointer handlers, ref, data-state) and must reach the button. */
function DockItem({ label, name, active, state = 'closed', windowsOpen = [], icon, dockApp, pressed, expanded, onClick, ...trigger }: ItemProps & TriggerProps) {
  const reduce = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const previous = useRef(state)
  useEffect(() => {
    const was = previous.current
    previous.current = state
    if (reduce || !scope.current || state !== 'minimized' || was === 'minimized' || was === 'closed') return
    animate(scope.current, { y: [0, -5, 0, -2, 0], scale: [1, 1.14, 0.98, 1.04, 1] }, { delay: 0.42, duration: 0.55, ease: 'easeOut' })
  }, [state, reduce, animate, scope])
  const running = state !== 'closed'

  return (
    <button
      {...trigger}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      data-dock-app={dockApp}
      onClick={onClick}
      className={cn(
        'relative flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80',
        active ? 'bg-white px-3.5 text-foreground shadow-[0_2px_8px_oklch(0.15_0.03_250/0.25)]' : running ? 'bg-white/22 text-white ring-1 ring-white/35 hover:bg-white/30' : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {running && !active && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className={cn('absolute inset-0 rounded-full border-2 border-white/80 bg-white/15', state === 'minimized' ? 'dock-ripple-slow' : 'dock-ripple')} />
        </span>
      )}
      <span ref={scope} className="relative flex items-center justify-center">
        {icon}
      </span>
      {active && <span className="pr-0.5 text-sm font-semibold whitespace-nowrap">{name}</span>}
      {running && (
        <span aria-hidden className="absolute -bottom-[7px] left-1/2 flex -translate-x-1/2 items-center gap-1">
          {windowsOpen.length > 1
            ? windowsOpen.slice(0, 4).map((min, i) => <span key={i} className={cn('size-[5px] rounded-full', min ? 'bg-danger/60' : 'bg-danger shadow-[0_0_6px_var(--danger)]')} />)
            : (
                <span className={cn('h-[3px] rounded-full transition-[width,background-color] duration-200', state === 'minimized' ? 'w-2.5 bg-danger/60' : 'w-5 bg-danger shadow-[0_0_8px_var(--danger)]')} />
              )}
        </span>
      )}
    </button>
  )
}

/** Wraps a tile: closed apps get a name tooltip; running apps get window previews. */
function DockEntry({ appId, item }: { appId?: AppId; item: ItemProps }) {
  const { windows, focusWindow, closeWindow } = useOs()
  const wins = appId ? windows.filter((w) => w.appId === appId) : []
  const windowsOpen = wins.map((w) => w.status === 'minimized')
  const count = wins.length > 1 ? ` · ${wins.length} windows` : ''
  // A click acts on the app, so its preview steps aside until the pointer leaves the tile.
  const [open, setOpen] = useState(false)
  const [suppressed, setSuppressed] = useState(false)
  const tile = <DockItem {...item} label={item.label + count} windowsOpen={windowsOpen} />
  // Slot merges trigger props into its child, so the child must be DockItem itself (it spreads them).
  if (appId && wins.length > 0) {
    return (
      <HoverCardPrimitive.Root openDelay={280} closeDelay={120} open={open && !suppressed} onOpenChange={setOpen}>
        <HoverCardPrimitive.Trigger
          asChild
          onClickCapture={() => {
            setSuppressed(true)
            setOpen(false)
          }}
          onPointerLeave={() => setSuppressed(false)}
        >
          <DockItem {...item} label={item.label + count} windowsOpen={windowsOpen} />
        </HoverCardPrimitive.Trigger>
        <HoverCardPrimitive.Portal>
          <HoverCardPrimitive.Content side="bottom" sideOffset={12} collisionPadding={12} className="widget-glass z-50 rounded-2xl p-2 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <WindowPreviews
              app={getApp(appId)}
              wins={wins}
              onPick={(id) => {
                setOpen(false)
                focusWindow(id)
              }}
              onClose={closeWindow}
            />
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
      </HoverCardPrimitive.Root>
    )
  }
  if (item.active) return tile
  return (
    <Tooltip>
      <TooltipTrigger asChild>{tile}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={10}>
        {item.name}
      </TooltipContent>
    </Tooltip>
  )
}

export function Dock() {
  const { windows, activateFromDock, setLauncherOpen, launcherOpen, showDesktop } = useOs()
  const runState = useRunState()
  const reduce = useReducedMotion()

  const onDesktop = windows.every((w) => w.status === 'minimized') && !launcherOpen
  const openApps: AppDefinition[] = windows
    .map((w) => w.appId)
    .filter((id, i, all) => all.indexOf(id) === i && !platformIds.has(id) && !excludedFromOpenList.has(id))
    .map((id) => getApp(id))

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-auto flex h-14 max-w-full min-w-0 items-center gap-2 overflow-x-auto rounded-full border border-white/20 bg-white/12 px-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_6px_20px_-6px_oklch(0.15_0.03_250/0.45)] backdrop-blur-xl no-scrollbar"
    >
      <DockEntry item={{ label: 'Home', name: 'Home', active: onDesktop, pressed: onDesktop, icon: <House aria-hidden className="size-[18px]" />, onClick: showDesktop }} />
      <DockEntry item={{ label: 'Open launcher', name: 'Applications', active: launcherOpen, expanded: launcherOpen, icon: <LayoutGrid aria-hidden className="size-[18px]" />, onClick: () => setLauncherOpen(true) }} />
      {platformItems.map(({ appId, short, icon: Icon }) => {
        const state = runState(appId)
        const name = getApp(appId).name
        return (
          <DockEntry
            key={appId}
            appId={appId}
            item={{
              label: state === 'closed' ? name : `${name} · ${runStateLabel[state]}`,
              name: short,
              active: state === 'focused' && !launcherOpen,
              state,
              dockApp: appId,
              icon: <Icon aria-hidden className="size-[18px]" />,
              onClick: () => activateFromDock(appId),
            }}
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
              <DockEntry
                appId={app.id}
                item={{
                  label: `${app.name} · ${runStateLabel[state]}`,
                  name: app.name,
                  active: state === 'focused' && !launcherOpen,
                  state,
                  dockApp: app.id,
                  icon: <AppIcon app={app} variant="soft" className="size-8 rounded-full [&_svg]:size-4" />,
                  onClick: () => activateFromDock(app.id),
                }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </nav>
  )
}
