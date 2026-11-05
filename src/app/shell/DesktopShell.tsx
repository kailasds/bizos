import { useEffect } from 'react'
import { useOs } from '@/app/os/use-os'
import { WindowManager } from '@/app/windows/WindowManager'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ApplicationLauncher } from './ApplicationLauncher'
import { AssistantPanel } from './AssistantPanel'
import { DesktopCanvas } from './DesktopCanvas'
import { Dock } from './Dock'
import { TopBar } from './TopBar'

/**
 * The persistent OS shell. Layers, bottom to top:
 * desktop canvas → windows → assistant → dock. Launcher and notifications are portalled overlays.
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
      <div className="flex h-full flex-col bg-background">
        <TopBar />
        {/* Desktop area: everything between the top bar and the dock reserve. */}
        <main className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-[84px]">
            <DesktopCanvas />
            <WindowManager />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[84px] z-10">
            <AssistantPanel />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
            <Dock />
          </div>
        </main>
      </div>
      <ApplicationLauncher />
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
