import { FilePlus2, Image, LayoutDashboard, Plus, ScanSearch, Send } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** The “+” beside the dock: quick ways to create something on the OS. */
export function QuickCreate() {
  const { openApp, setLauncherOpen } = useOs()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Create"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_oklch(0.55_0.14_248/0.7)] outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/80 data-[state=open]:rotate-45"
        >
          <Plus className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={10} className="w-60">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => openApp('application-studio', { new: String(Date.now()) })}>
          <FilePlus2 />
          New application
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openApp('claims-intelligence', { view: 'submit' })}>
          <Send />
          New transaction
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openApp('settings', { section: 'desktop' })}>
          <LayoutDashboard />
          Add widget
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openApp('settings', { section: 'desktop' })}>
          <Image />
          Change wallpaper
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLauncherOpen(true)}>
          <ScanSearch />
          Find an application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
