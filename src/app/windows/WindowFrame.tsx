import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import type { AppDefinition, Size } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { cn } from '@/lib/utils'
import { clampBounds, type Bounds, type WindowState } from './windowReducer'

const controlTone = {
  maximize: 'bg-control-maximize',
  minimize: 'bg-control-minimize',
  close: 'bg-control-close',
} as const

function WindowControl({
  tone,
  label,
  onClick,
  children,
}: {
  tone: keyof typeof controlTone
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          'flex size-3.5 items-center justify-center rounded-full text-foreground/70 shadow-[inset_0_0_0_0.5px_oklch(0_0_0/0.18)] group-data-[focused=false]/window:bg-foreground/20 [&_svg]:size-2.5 [&_svg]:stroke-[2.5] [&_svg]:opacity-0 group-hover/controls:[&_svg]:opacity-100 group-focus-within/controls:[&_svg]:opacity-100',
          controlTone[tone],
        )}
      >
        {children}
      </span>
    </button>
  )
}

interface Gesture {
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: Bounds
}

interface WindowFrameProps {
  win: WindowState
  app: AppDefinition
  title: string
  focused: boolean
  area: Size
  /** Small viewports: every window fills the desktop area and cannot be dragged. */
  compact: boolean
  children: ReactNode
}

export function WindowFrame({ win, app, title, focused, area, compact, children }: WindowFrameProps) {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, setWindowBounds } = useOs()
  const [live, setLive] = useState<Bounds | null>(null)
  const gesture = useRef<Gesture | null>(null)

  const maximized = compact || win.status === 'maximized'
  const bounds = live ?? clampBounds(win.bounds, area)

  const startGesture = (mode: Gesture['mode']) => (event: PointerEvent<HTMLElement>) => {
    if (maximized || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { mode, startX: event.clientX, startY: event.clientY, origin: bounds }
  }

  const moveGesture = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g) return
    const dx = event.clientX - g.startX
    const dy = event.clientY - g.startY
    if (g.mode === 'move') {
      setLive(clampBounds({ ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy }, area))
    } else {
      setLive({
        ...g.origin,
        width: Math.min(Math.max(g.origin.width + dx, app.minSize.width), area.width - g.origin.x),
        height: Math.min(Math.max(g.origin.height + dy, app.minSize.height), area.height - g.origin.y),
      })
    }
  }

  const endGesture = () => {
    if (gesture.current && live) setWindowBounds(win.id, live)
    gesture.current = null
    setLive(null)
  }

  const gestureHandlers = (mode: Gesture['mode']) => ({
    onPointerDown: startGesture(mode),
    onPointerMove: moveGesture,
    onPointerUp: endGesture,
    onPointerCancel: endGesture,
  })

  return (
    <section
      aria-label={title}
      data-focused={focused}
      hidden={win.status === 'minimized'}
      onPointerDownCapture={() => focusWindow(win.id)}
      onFocusCapture={() => focusWindow(win.id)}
      style={
        maximized
          ? { zIndex: win.z, left: 0, top: 0, width: '100%', height: '100%' }
          : { zIndex: win.z, left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }
      }
      className={cn(
        'group/window glass pointer-events-auto absolute flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-[0.985] [animation-duration:150ms]',
        maximized ? 'rounded-none border-x-0 border-t-0 sm:rounded-2xl sm:border' : 'rounded-2xl',
        focused ? 'shadow-window-active' : 'shadow-window',
        live && 'select-none',
      )}
    >
      <header
        className={cn(
          'flex h-11 shrink-0 items-center gap-2 pr-2 pl-3.5',
          !maximized && 'cursor-grab active:cursor-grabbing',
        )}
        onDoubleClick={(event) => {
          if (compact || (event.target as HTMLElement).closest('button')) return
          toggleMaximize(win.id)
        }}
        {...gestureHandlers('move')}
      >
        <AppIcon app={app} size="xs" />
        <h2 className={cn('min-w-0 flex-1 truncate text-sm font-semibold', !focused && 'text-foreground/55')}>
          {title}
        </h2>
        {/* Window controls (design.md §7): filled dots, maximize · minimize · close, glyph on hover. */}
        <div className="group/controls flex items-center gap-0.5">
          {!compact && (
            <WindowControl
              tone="maximize"
              label={win.status === 'maximized' ? `Restore ${app.name}` : `Maximize ${app.name}`}
              onClick={() => toggleMaximize(win.id)}
            >
              {win.status === 'maximized' ? <Minimize2 /> : <Maximize2 />}
            </WindowControl>
          )}
          <WindowControl tone="minimize" label={`Minimize ${app.name}`} onClick={() => minimizeWindow(win.id)}>
            <Minus />
          </WindowControl>
          <WindowControl tone="close" label={`Close ${app.name}`} onClick={() => closeWindow(win.id)}>
            <X />
          </WindowControl>
        </div>
      </header>

      <div className="@container relative mx-1.5 mb-1.5 min-h-0 flex-1 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_oklch(0.2_0.02_220/0.06)]">{children}</div>

      {!maximized && (
        <div
          aria-hidden
          className="absolute right-0 bottom-0 z-10 size-4 cursor-se-resize"
          {...gestureHandlers('resize')}
        />
      )}
    </section>
  )
}
