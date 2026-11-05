import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import type { AppDefinition, Size } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { clampBounds, type Bounds, type WindowState } from './windowReducer'

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
        'pointer-events-auto absolute flex flex-col overflow-hidden border bg-card text-card-foreground animate-in fade-in-0 zoom-in-[0.985] [animation-duration:150ms]',
        maximized ? 'rounded-none border-x-0 border-t-0 sm:rounded-xl sm:border' : 'rounded-xl',
        focused ? 'border-border shadow-window-active' : 'border-border/80 shadow-window',
        live && 'select-none',
      )}
    >
      <header
        className={cn(
          'flex h-10 shrink-0 items-center gap-2 border-b bg-chrome pr-1.5 pl-3',
          !maximized && 'cursor-grab active:cursor-grabbing',
        )}
        onDoubleClick={(event) => {
          if (compact || (event.target as HTMLElement).closest('button')) return
          toggleMaximize(win.id)
        }}
        {...gestureHandlers('move')}
      >
        <AppIcon app={app} size="xs" />
        <h2 className={cn('min-w-0 flex-1 truncate text-sm font-medium', !focused && 'text-muted-foreground')}>
          {title}
        </h2>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label={`Minimize ${app.name}`} onClick={() => minimizeWindow(win.id)}>
            <Minus />
          </Button>
          {!compact && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={win.status === 'maximized' ? `Restore ${app.name}` : `Maximize ${app.name}`}
              onClick={() => toggleMaximize(win.id)}
            >
              {win.status === 'maximized' ? <Minimize2 /> : <Maximize2 />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Close ${app.name}`}
            className="hover:bg-danger-soft hover:text-danger-ink"
            onClick={() => closeWindow(win.id)}
          >
            <X />
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">{children}</div>

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
