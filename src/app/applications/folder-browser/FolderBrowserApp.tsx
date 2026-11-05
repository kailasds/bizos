import { useState } from 'react'
import { Folder, FolderOpen, LayoutGrid } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, businessApps, folders, getFolder } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
import { useParamsChange } from '@/app/windows/use-params-change'
import type { AppProps, DomainId } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

type Location = DomainId | 'all'

const toLocation = (v: string | undefined): Location => (v && getFolder(v) ? (v as DomainId) : 'all')

/** File-explorer-like view of applications grouped by domain folder. */
export function FolderBrowserApp({ params }: AppProps) {
  const { openApp, setLauncherOpen } = useOs()
  const [location, setLocation] = useState<Location>(toLocation(params.folder))

  useParamsChange(params, (p) => setLocation(toLocation(p.folder)))

  const registered = useApplications()
  const allBusiness = businessApps(registered)
  const apps = location === 'all' ? allBusiness : appsInFolder(location, registered)
  const folder = location === 'all' ? null : getFolder(location)

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav
        label="Folders"
        value={location}
        onChange={setLocation}
        items={[
          { id: 'all', label: 'All applications', icon: LayoutGrid, meta: allBusiness.length },
          ...folders.map((f) => ({
            id: f.id,
            label: f.name,
            icon: f.id === location ? FolderOpen : Folder,
            meta: appsInFolder(f.id, registered).length,
          })),
        ]}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        <h3 className="text-lg font-semibold">{folder ? folder.name : 'All applications'}</h3>
        <p className="text-sm text-muted-foreground">{folder ? folder.description : 'Every business application on this OS.'}</p>

        {apps.length === 0 ? (
          <Empty className="mt-6 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder />
              </EmptyMedia>
              <EmptyTitle>No applications in {folder?.name} yet</EmptyTitle>
              <EmptyDescription>Applications built for this domain will appear here once they are published.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => setLauncherOpen(true)}>
              Browse all applications
            </Button>
          </Empty>
        ) : (
          <ul className="mt-6 divide-y rounded-lg border">
            {apps.map((app) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => openApp(app.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <AppIcon app={app} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{app.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{app.description}</span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground tabular-nums @2xl:inline">v{app.version}</span>
                  <StatusBadge tone={app.lifecycle === 'published' ? 'success' : 'info'}>
                    {app.lifecycle === 'published' ? 'Published' : 'Preview'}
                  </StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
