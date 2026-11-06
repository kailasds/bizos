import { FilePlus2, Sparkles } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { folders, launcherApps } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
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

/**
 * Name matches rank above description matches, and every typed word must appear somewhere —
 * so “Learning” opens Learning rather than a fuzzy match buried in another app's description.
 */
function launcherFilter(value: string, search: string, keywords: string[] = []): number {
  const name = value.toLowerCase()
  const q = search.trim().toLowerCase()
  if (!q) return 1
  if (name.startsWith(q)) return 1
  if (name.includes(q)) return 0.9
  const words = q.split(/\s+/)
  const text = [name, ...keywords.map((k) => k.toLowerCase())].join(' ')
  if (words.every((w) => name.includes(w))) return 0.8
  return words.every((w) => text.includes(w)) ? 0.4 : 0
}

export function ApplicationLauncher() {
  const { launcherOpen, setLauncherOpen, openApp, setAssistantOpen } = useOs()

  const launch = (appId: AppId, params?: WindowParams) => {
    openApp(appId, params)
    setLauncherOpen(false)
  }

  const apps = launcherApps(useApplications())
  const business = apps.filter((a) => a.kind === 'application')
  const system = apps.filter((a) => a.kind === 'system')

  return (
    <CommandDialog
      open={launcherOpen}
      onOpenChange={setLauncherOpen}
      title="Launcher"
      description="Search applications, folders and system workspaces"
      className="sm:max-w-xl"
    >
      <Command filter={launcherFilter}>
        <CommandInput placeholder="Search applications and workspaces…" />
        <CommandList className="max-h-[min(26rem,60vh)]">
          <CommandEmpty>No applications match that search.</CommandEmpty>
          <CommandGroup heading="Create">
            <CommandItem
              value="Create application"
              keywords={['new', 'build', 'generate', 'studio', 'design']}
              onSelect={() => launch('application-studio', { new: String(Date.now()) })}
              className="gap-3 py-2"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FilePlus2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">Create application</div>
                <div className="truncate text-xs text-muted-foreground">Describe a business problem; Application Studio designs and publishes the application.</div>
              </div>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
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
