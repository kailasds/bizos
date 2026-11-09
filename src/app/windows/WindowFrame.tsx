import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
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
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const minimized = win.status === 'minimized'

  // Restore plays the genie backwards only when the window is coming back from the dock.
  const [previous, setPrevious] = useState(minimized)
  const [restoring, setRestoring] = useState(false)
  if (previous !== minimized) {
    setPrevious(minimized)
    setRestoring(previous && !minimized)
  }

  /**
   * Genie geometry, measured when the animation starts so it follows the dock wherever it is:
   * the edge nearest the dock pinches toward the tile, then the body is drawn up into it.
   */
  const genie = () => {
    const node = ref.current
    const target = document.querySelector(`[data-dock-app="${win.appId}"]`)
    const r = node?.getBoundingClientRect()
    const d = target?.getBoundingClientRect()
    if (!r || !d || r.width === 0) return null
    const px = Math.min(96, Math.max(4, ((d.left + d.width / 2 - r.left) / r.width) * 100))
    const dx = d.left + d.width / 2 - (r.left + (px / 100) * r.width)
    const dy = d.top + d.height / 2 - r.top
    // Set directly: animating transform-origin would blend from an unrelated value.
    if (node) node.style.transformOrigin = `${px}% 0%`
    const poly = (tl: number, tr: number, br: number, bl: number) => `polygon(${tl}% 0%, ${tr}% 0%, ${br}% 100%, ${bl}% 100%)`
    return {
      clipPath: [poly(0, 100, 100, 0), poly(px - 9, px + 9, 100, 0), poly(px - 2, px + 2, px + 22, px - 22), poly(px - 0.5, px + 0.5, px + 0.5, px - 0.5)],
      x: [0, 0, dx * 0.55, dx],
      y: [0, 0, dy * 0.5, dy],
      scaleY: [1, 1, 0.42, 0.02],
    }
  }

  const variants: Variants = {
    shown: (isRestoring: boolean) => {
      const g = isRestoring && !reduce ? genie() : null
      if (!g) {
        return { x: 0, y: 0, scaleY: 1, scale: 1, opacity: 1, clipPath: 'none', visibility: 'visible', transition: reduce ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } }
      }
      return {
        visibility: 'visible',
        opacity: 1,
        scale: 1,
        clipPath: [...g.clipPath].reverse(),
        x: [...g.x].reverse(),
        y: [...g.y].reverse(),
        scaleY: [...g.scaleY].reverse(),
        transition: { duration: 0.46, times: [0, 0.3, 0.65, 1], ease: 'easeOut' },
        transitionEnd: { clipPath: 'none' },
      }
    },
    minimized: () => {
      const g = reduce ? null : genie()
      if (!g) return { opacity: 0, transition: { duration: 0 }, transitionEnd: { visibility: 'hidden' } }
      return {
        scale: 1,
        clipPath: g.clipPath,
        x: g.x,
        y: g.y,
        scaleY: g.scaleY,
        opacity: [1, 1, 1, 0],
        transition: { duration: 0.52, times: [0, 0.32, 0.68, 1], ease: 'easeIn' },
        transitionEnd: { visibility: 'hidden' },
      }
    },
  }

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
    <motion.section
      ref={ref}
      aria-label={title}
      aria-hidden={minimized || undefined}
      inert={minimized}
      data-focused={focused}
      data-status={win.status}
      data-window-id={win.id}
      variants={variants}
      custom={restoring}
      // The reverse genie plays once; afterwards the window is simply shown.
      onAnimationComplete={(definition) => definition === 'shown' && restoring && setRestoring(false)}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={minimized ? 'minimized' : 'shown'}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: 'easeIn' } }}
      onPointerDownCapture={() => focusWindow(win.id)}
      onFocusCapture={() => focusWindow(win.id)}
      style={
        maximized
          ? { zIndex: win.z, left: 0, top: 0, width: '100%', height: '100%' }
          : { zIndex: win.z, left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }
      }
      className={cn(
        'group/window glass absolute flex origin-center flex-col overflow-hidden text-card-foreground will-change-transform',
        minimized ? 'pointer-events-none' : 'pointer-events-auto',
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
    </motion.section>
  )
}
