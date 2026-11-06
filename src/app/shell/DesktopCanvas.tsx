import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, desktopShortcuts, folders } from '@/app/registry/applicationRegistry'
import type { AppDefinition, FolderDefinition } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { DesktopWidgets } from '@/app/widgets/DesktopWidgets'
import { AppIcon } from '@/components/os/AppIcon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const countLabel = (n: number) => `${n} application${n === 1 ? '' : 's'}`

const largeIcon = 'size-14 rounded-2xl [&_svg]:size-7'

/** A domain on the desktop: one glass tile previewing up to four of the applications inside. */
function DomainTile({ folder, apps, onOpen }: { folder: FolderDefinition; apps: AppDefinition[]; onOpen: () => void }) {
  const overflow = apps.length > 4 ? apps.length - 3 : 0
  const shown = apps.slice(0, overflow ? 3 : 4)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${folder.name}, folder, ${countLabel(apps.length)}`}
      className="widget-glass flex w-40 flex-col gap-3 rounded-[26px] p-4 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none"
    >
      <span aria-hidden className="grid grid-cols-2 gap-2">
        {shown.map((app) => (
          <AppIcon key={app.id} app={app} className={largeIcon} />
        ))}
        {overflow > 0 && <span className="flex size-14 items-center justify-center rounded-2xl bg-white/55 text-sm font-semibold tabular-nums">+{overflow}</span>}
        {Array.from({ length: Math.max(0, 4 - shown.length - (overflow ? 1 : 0)) }, (_, i) => (
          <span key={i} className="size-14 rounded-2xl bg-white/25 ring-1 ring-white/40 ring-inset" />
        ))}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{folder.name}</span>
        <span className="block text-xs text-muted-foreground tabular-nums">{countLabel(apps.length)}</span>
      </span>
    </button>
  )
}

/** The applications inside a domain, in a glass panel sized to how many there are. */
function DomainPanel({ folder, apps, onClose, onOpenApp, onOpenFolder, onCreate }: { folder: FolderDefinition | null; apps: AppDefinition[]; onClose: () => void; onOpenApp: (app: AppDefinition) => void; onOpenFolder: () => void; onCreate: () => void }) {
  const columns = Math.min(Math.max(apps.length, 2), 4)
  return (
    <Dialog open={Boolean(folder)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="domain-panel-description" className="widget-glass w-fit max-w-[calc(100vw-2rem)] gap-4 rounded-[28px] p-5 sm:max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-1 pr-8">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold">{folder?.name}</DialogTitle>
            <DialogDescription id="domain-panel-description" className="text-xs text-muted-foreground tabular-nums">
              {countLabel(apps.length)}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Open ${folder?.name} in Folders`} title="Open in Folders" onClick={onOpenFolder}>
            <FolderOpen />
          </Button>
        </div>
        {apps.length === 0 ? (
          <div className="flex w-64 flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">No applications in this domain yet.</p>
            <Button size="sm" onClick={onCreate}>
              Create application
            </Button>
          </div>
        ) : (
          <ul className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, 7rem)` }}>
            {apps.map((app) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => onOpenApp(app)}
                  aria-label={`${app.name}, application`}
                  className="flex h-full w-full flex-col items-center gap-2 rounded-2xl p-2 text-center outline-none hover:bg-white/50 focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <AppIcon app={app} className={largeIcon} />
                  <span className="line-clamp-2 text-xs leading-tight font-medium">{app.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A platform tool: not an application of any domain, so it stands alone. */
function ToolCard({ app, onOpen }: { app: AppDefinition; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${app.name}, application`}
        className="widget-glass flex h-full w-full items-center gap-3 rounded-[22px] p-3 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none"
      >
        <AppIcon app={app} size="md" className="size-11 rounded-[14px]" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{app.name}</span>
          <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">{app.tagline ?? app.description}</span>
        </span>
      </button>
    </li>
  )
}

/** Newly published applications lead, so a fresh app shows in the domain's preview. */
const newestFirst = (list: AppDefinition[]) => [...list].sort((a, b) => (b.generated?.publishedAt ?? '').localeCompare(a.generated?.publishedAt ?? ''))

const sectionTitle = 'px-1 text-sm font-semibold text-foreground/85'

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()
  const [openFolderId, setOpenFolderId] = useState<FolderDefinition['id'] | null>(null)
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null
  const appsOf = (folder: FolderDefinition) => newestFirst(appsInFolder(folder.id, apps))
  // Application Studio is reached from the "+" menu and the dock, so it isn't repeated here.
  const tools = desktopShortcuts(apps).filter((a) => a.domains.length === 0 && a.id !== 'application-studio')

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className={cn('flex min-w-0 flex-1 flex-col gap-9 md:overflow-y-auto md:pr-2 md:no-scrollbar')}>
        <section aria-label="Domains" className="space-y-3">
          <h2 className={sectionTitle}>Applications</h2>
          <div className="flex flex-wrap items-start gap-4">
            {folders.map((folder) => (
              <DomainTile key={folder.id} folder={folder} apps={appsOf(folder)} onOpen={() => setOpenFolderId(folder.id)} />
            ))}
          </div>
        </section>

        <section aria-label="Platform tools" className="space-y-3">
          <h2 className={sectionTitle}>Platform tools</h2>
          <ul className="grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tools.map((app) => (
              <ToolCard key={app.id} app={app} onOpen={() => openApp(app.id)} />
            ))}
          </ul>
        </section>
      </div>

      <div className="md:no-scrollbar md:w-80 md:shrink-0 md:overflow-y-auto">
        <DesktopWidgets />
      </div>

      <DomainPanel
        folder={openFolder}
        apps={openFolder ? appsOf(openFolder) : []}
        onClose={() => setOpenFolderId(null)}
        onOpenApp={(app) => {
          setOpenFolderId(null)
          openApp(app.id)
        }}
        onOpenFolder={() => {
          const id = openFolderId
          setOpenFolderId(null)
          if (id) openApp('folder-browser', { folder: id })
        }}
        onCreate={() => {
          setOpenFolderId(null)
          openApp('application-studio', { new: String(Date.now()) })
        }}
      />
    </div>
  )
}
