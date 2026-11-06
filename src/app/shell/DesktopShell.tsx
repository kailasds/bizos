import { useEffect } from 'react'
import { useOs } from '@/app/os/use-os'
import { WindowManager } from '@/app/windows/WindowManager'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ApplicationLauncher } from './ApplicationLauncher'
import { AssistantPanel } from './AssistantPanel'
import { DesktopCanvas } from './DesktopCanvas'
import { TopBar } from './TopBar'

/**
 * The persistent OS shell. Layers, bottom to top:
 * top bar (with the dock) · desktop canvas → windows → assistant. Launcher and notifications are portalled overlays.
 */
export function DesktopShell() {
  const { launcherOpen, setLauncherOpen } = useOs()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setLauncherOpen(!launcherOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [launcherOpen, setLauncherOpen])

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      <div className="flex h-full flex-col">
        <TopBar />
        {/* Desktop area: everything below the top bar. */}
        <main className="relative flex-1">
          <div className="absolute inset-0">
            <DesktopCanvas />
            <WindowManager />
          </div>
          <div className="pointer-events-none absolute inset-0 z-10">
            <AssistantPanel />
          </div>
        </main>
      </div>
      <ApplicationLauncher />
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
