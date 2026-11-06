import type { ReactNode } from 'react'
import { ChevronRight, Folder, Plus } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, desktopShortcuts, folders } from '@/app/registry/applicationRegistry'
import type { AppDefinition } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { DesktopWidgets } from '@/app/widgets/DesktopWidgets'
import { AppIcon } from '@/components/os/AppIcon'

/** One app inside a folder group: the standard icon + name tile. */
function FolderAppTile({ app, onOpen }: { app: AppDefinition; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${app.name}, application`}
        className="flex w-[5.5rem] flex-col items-center gap-2 rounded-xl px-1 py-2 text-center outline-none hover:bg-white/60 focus-visible:bg-white/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/80"
      >
        <AppIcon app={app} size="lg" />
        <span className="line-clamp-2 text-xs leading-tight font-medium">{app.name}</span>
      </button>
    </li>
  )
}

/**
 * A domain folder as a group on the desktop. Its width follows the number of apps it holds
 * (up to four per row); the header opens the folder browser.
 */
function FolderGroup({ folder, apps, onOpenFolder, onOpenApp }: { folder: (typeof folders)[number]; apps: AppDefinition[]; onOpenFolder: () => void; onOpenApp: (app: AppDefinition) => void }) {
  const cols = Math.max(1, Math.min(apps.length, 4))
  return (
    <section aria-label={`${folder.name} folder`} className="glass-strong rounded-2xl p-2 shadow-widget">
      <button
        type="button"
        onClick={onOpenFolder}
        aria-label={`${folder.name}, folder, ${apps.length} application${apps.length === 1 ? '' : 's'}`}
        className="group/folder flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-white/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Folder aria-hidden className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{folder.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{apps.length}</span>
        <ChevronRight aria-hidden className="ml-auto size-4 text-muted-foreground/60 group-hover/folder:text-foreground" />
      </button>
      {apps.length === 0 ? (
        <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">No applications yet</p>
      ) : (
        <ul className="grid gap-1 pt-1" style={{ gridTemplateColumns: `repeat(${cols}, 5.5rem)` }}>
          {apps.map((app) => (
            <FolderAppTile key={app.id} app={app} onOpen={() => onOpenApp(app)} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** A standalone application as a card with a one-line description. */
function AppCard({ icon, name, description, label, onOpen, dashed = false }: { icon: ReactNode; name: string; description: string; label: string; onOpen: () => void; dashed?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={
          dashed
            ? 'flex h-full w-full items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-white/55 p-3 text-left outline-none backdrop-blur-md hover:border-primary/70 hover:bg-white/75 focus-visible:ring-3 focus-visible:ring-ring/50'
            : 'glass-strong flex h-full w-full items-center gap-3 rounded-2xl p-3 text-left shadow-widget outline-none hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-ring/50'
        }
      >
        {icon}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    </li>
  )
}

const oneLiner = (description: string) => description.split(/(?<=\.)\s|—/)[0].replace(/\.$/, '')

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()
  // Domain applications live in their folders; everything else is a standalone card.
  const standalone = desktopShortcuts(apps).filter((a) => a.domains.length === 0)

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-7 md:overflow-y-auto md:pr-2 md:no-scrollbar">
        <section aria-label="Domains" className="space-y-2">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-foreground/70">Domains</h2>
          <div className="flex flex-wrap items-start gap-4">
            {folders.map((folder) => (
              <FolderGroup
                key={folder.id}
                folder={folder}
                apps={appsInFolder(folder.id, apps)}
                onOpenFolder={() => openApp('folder-browser', { folder: folder.id })}
                onOpenApp={(app) => openApp(app.id)}
              />
            ))}
          </div>
        </section>

        <section aria-label="Applications" className="space-y-2">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-foreground/70">Applications</h2>
          <ul className="grid max-w-4xl gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            <AppCard
              dashed
              label="Create Application, opens Application Studio"
              name="Create application"
              description="Describe a problem, publish an app"
              icon={
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Plus className="size-5" />
                </span>
              }
              onOpen={() => openApp('application-studio', { new: String(Date.now()) })}
            />
            {standalone.map((app) => (
              <AppCard key={app.id} label={`${app.name}, application`} name={app.name} description={app.tagline ?? oneLiner(app.description)} icon={<AppIcon app={app} size="md" className="size-11 rounded-xl" />} onOpen={() => openApp(app.id)} />
            ))}
          </ul>
        </section>
      </div>

      <div className="md:no-scrollbar md:w-80 md:shrink-0 md:overflow-y-auto md:pb-12 md:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]">
        <DesktopWidgets />
      </div>
    </div>
  )
}
