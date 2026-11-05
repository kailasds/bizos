import { Sparkles } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { folders, launcherApps } from '@/app/registry/applicationRegistry'
import type { AppId, WindowParams } from '@/app/registry/types'
import { AppIcon, FolderIcon } from '@/components/os/AppIcon'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const domainLabel = { insurance: 'Insurance', healthcare: 'Healthcare', banking: 'Banking' } as const

export function ApplicationLauncher() {
  const { launcherOpen, setLauncherOpen, openApp, setAssistantOpen } = useOs()

  const launch = (appId: AppId, params?: WindowParams) => {
    openApp(appId, params)
    setLauncherOpen(false)
  }

  const business = launcherApps.filter((a) => a.kind === 'application')
  const system = launcherApps.filter((a) => a.kind === 'system')

  return (
    <CommandDialog
      open={launcherOpen}
      onOpenChange={setLauncherOpen}
      title="Launcher"
      description="Search applications, folders and system workspaces"
      className="sm:max-w-xl"
    >
      <Command>
        <CommandInput placeholder="Search applications and workspaces…" />
        <CommandList className="max-h-[min(26rem,60vh)]">
          <CommandEmpty>No applications match that search.</CommandEmpty>
          <CommandGroup heading="Applications">
            {business.map((app) => (
              <CommandItem
                key={app.id}
                value={app.name}
                keywords={[app.description, ...app.domains.map((d) => domainLabel[d])]}
                onSelect={() => launch(app.id)}
                className="gap-3 py-2"
              >
                <AppIcon app={app} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{app.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{app.description}</div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {app.domains.length ? app.domains.map((d) => domainLabel[d]).join(', ') : 'Cross-domain'}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Folders">
            {folders.map((folder) => (
              <CommandItem
                key={folder.id}
                value={`${folder.name} folder`}
                keywords={[folder.description]}
                onSelect={() => launch('folder-browser', { folder: folder.id })}
                className="gap-3 py-2"
              >
                <FolderIcon folderId={folder.id} size="md" className="size-7 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{folder.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{folder.description}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="System">
            {system.map((app) => (
              <CommandItem
                key={app.id}
                value={app.name}
                keywords={[app.description]}
                onSelect={() => launch(app.id)}
                className="gap-3 py-2"
              >
                <AppIcon app={app} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{app.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{app.description}</div>
                </div>
              </CommandItem>
            ))}
            <CommandItem
              value="Assistant"
              keywords={['help', 'ask']}
              onSelect={() => {
                setLauncherOpen(false)
                setAssistantOpen(true)
              }}
              className="gap-3 py-2"
            >
              <span className="flex size-7 items-center justify-center rounded-md border bg-card">
                <Sparkles className="size-4" />
              </span>
              <div className="font-medium">Assistant</div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
