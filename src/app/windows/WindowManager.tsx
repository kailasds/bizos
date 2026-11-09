import { Suspense, useLayoutEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useOs } from '@/app/os/use-os'
import { resolveAppComponent } from '@/app/registry/applicationComponents'
import { getApp } from '@/app/registry/applicationRegistry'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import { WindowFrame } from './WindowFrame'

function WindowLoading() {
  return (
    <div className="space-y-3 p-6" aria-busy aria-label="Loading application">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/**
 * Hosts every open window. Independent of application internals: it only knows
 * window state and which component the registry maps an app id to.
 */
export function WindowManager() {
  const { windows, focusedId, desktopArea, setDesktopArea } = useOs()
  const rootRef = useRef<HTMLDivElement>(null)
  const compact = useIsMobile()

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    const measure = () => setDesktopArea({ width: node.clientWidth, height: node.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [setDesktopArea])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 isolate z-[1]">
      <AnimatePresence>
      {windows.map((win) => {
        const Component = resolveAppComponent(win.appId)
        return (
          <WindowFrame
            key={win.id}
            win={win}
            app={getApp(win.appId)}
            title={win.instance > 1 ? `${getApp(win.appId).name} ${win.instance}` : getApp(win.appId).name}
            focused={win.id === focusedId}
            area={desktopArea}
            compact={compact}
          >
            <Suspense fallback={<WindowLoading />}>
              <Component windowId={win.id} params={win.params} />
            </Suspense>
          </WindowFrame>
        )
      })}
      </AnimatePresence>
    </div>
  )
}
