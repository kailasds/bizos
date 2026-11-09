import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
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

  /** The dock tile's centre relative to the window, and the scale that fits the window into it. */
  const dockGeometry = () => {
    const node = ref.current
    const r = node?.getBoundingClientRect()
    const d = document.querySelector(`[data-dock-app="${win.appId}"]`)?.getBoundingClientRect()
    if (!node || !r || !d || r.width === 0) return null
    return { node, r, d }
  }

  /**
   * Minimize: a genie. The edge nearest the dock pinches toward the tile, then the body is drawn up
   * into it. Measured when the animation starts so it follows the dock wherever it is.
   */
  const genie = () => {
    const g = dockGeometry()
    if (!g) return null
    const { node, r, d } = g
    const px = Math.min(96, Math.max(4, ((d.left + d.width / 2 - r.left) / r.width) * 100))
    const dx = d.left + d.width / 2 - (r.left + (px / 100) * r.width)
    const dy = d.top + d.height / 2 - r.top
    // Set directly: animating transform-origin would blend from an unrelated value.
    node.style.transformOrigin = `${px}% 0%`
    const poly = (tl: number, tr: number, br: number, bl: number) => `polygon(${tl}% 0%, ${tr}% 0%, ${br}% 100%, ${bl}% 100%)`
    return {
      clipPath: [poly(0, 100, 100, 0), poly(px - 9, px + 9, 100, 0), poly(px - 2, px + 2, px + 22, px - 22), poly(px - 0.5, px + 0.5, px + 0.5, px - 0.5)],
      x: [0, 0, dx * 0.55, dx],
      y: [0, 0, dy * 0.5, dy],
      scaleY: [1, 1, 0.42, 0.02],
    }
  }

  /** Restore: transform and opacity only (compositor-driven), growing back out of the tile. */
  const fromDock = () => {
    const g = dockGeometry()
    if (!g) return null
    const { node, r, d } = g
    node.style.transformOrigin = '50% 50%'
    node.style.clipPath = 'none' // the genie leaves a collapsed clip; it also limits where clicks land
    return { dx: d.left + d.width / 2 - (r.left + r.width / 2), dy: d.top + d.height / 2 - (r.top + r.height / 2), s: Math.max(0.05, d.width / r.width) }
  }

  const easeOut = [0.16, 1, 0.3, 1] as const
  const fullClip = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

  const variants: Variants = {
    shown: (isRestoring: boolean) => {
      const t = isRestoring && !reduce ? fromDock() : null
      if (!t) {
        if (ref.current) {
          ref.current.style.transformOrigin = '50% 50%'
          ref.current.style.clipPath = 'none'
        }
        return {
          x: 0,
          y: 0,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visibility: 'visible',
          // Taking over the clip value cancels any genie clip still pending, then it is cleared.
          clipPath: fullClip,
          transition: reduce ? { duration: 0 } : { duration: 0.26, ease: easeOut, clipPath: { duration: 0 } },
          transitionEnd: { clipPath: 'none' },
        }
      }
      return {
        visibility: 'visible',
        scale: 1,
        x: [t.dx, 0],
        y: [t.dy, 0],
        scaleX: [t.s, 1],
        scaleY: [t.s * 0.6, 1],
        opacity: [0, 1],
        clipPath: fullClip,
        transition: { duration: 0.38, ease: easeOut, opacity: { duration: 0.16, ease: 'easeOut' }, clipPath: { duration: 0 } },
        transitionEnd: { clipPath: 'none' },
      }
    },
    minimized: () => {
      const g = reduce ? null : genie()
      if (!g) return { opacity: 0, transition: { duration: 0 }, transitionEnd: { visibility: 'hidden' } }
      return {
        scale: 1,
        scaleX: 1,
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

  /*
   * While a window moves, its frosted glass would be re-blurred on every frame; it switches to a
   * solid pane for the duration of the animation (set on the node, so React doesn't re-render).
   */
  const setMoving = (moving: boolean) => {
    if (ref.current) ref.current.dataset.moving = moving ? 'true' : 'false'
  }

  // The app mounts once the opening animation has finished, so nothing heavy competes with it.
  const [contentReady, setContentReady] = useState(Boolean(reduce))
  useEffect(() => {
    if (contentReady) return
    const id = window.setTimeout(() => setContentReady(true), 420) // fallback if the animation is skipped
    return () => window.clearTimeout(id)
  }, [contentReady])

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
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={(definition) => {
        setMoving(false)
        if (definition === 'shown') {
          if (restoring) setRestoring(false)
          if (!contentReady) setContentReady(true)
        }
      }}
      initial={reduce ? false : { opacity: 0, scale: 0.965, y: 10 }}
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
          {win.title && <span className="font-normal text-muted-foreground"> · {win.title}</span>}
        </h2>
        {/* Window controls (design.md §7): filled dots, maximize · minimize · close, glyph on hover. */}
        <div className="group/controls flex items-center gap-0.5">
          {!compact && (
            <WindowControl
              tone="maximize"
              label={win.status === 'maximized' ? `Restore ${title}` : `Maximize ${title}`}
              onClick={() => toggleMaximize(win.id)}
            >
              {win.status === 'maximized' ? <Minimize2 /> : <Maximize2 />}
            </WindowControl>
          )}
          <WindowControl tone="minimize" label={`Minimize ${title}`} onClick={() => minimizeWindow(win.id)}>
            <Minus />
          </WindowControl>
          <WindowControl tone="close" label={`Close ${title}`} onClick={() => closeWindow(win.id)}>
            <X />
          </WindowControl>
        </div>
      </header>

      <div className="@container relative mx-1.5 mb-1.5 min-h-0 flex-1 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_oklch(0.2_0.02_220/0.06)]">
        {contentReady && (
          <motion.div className="h-full" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.14, ease: 'easeOut' }}>
            {children}
          </motion.div>
        )}
      </div>

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
