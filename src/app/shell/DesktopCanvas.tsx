import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, desktopShortcuts, folders } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
import { AppIcon, FolderIcon } from '@/components/os/AppIcon'
import { DesktopWidgets } from '@/app/widgets/DesktopWidgets'

function DesktopIcon({
  label,
  detail,
  icon,
  onOpen,
}: {
  label: string
  detail: string
  icon: ReactNode
  onOpen: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${label}, ${detail}`}
        className="flex w-24 flex-col items-center gap-2 rounded-lg px-1 py-2 text-center outline-none hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-foreground/8"
      >
        {icon}
        <span className="line-clamp-2 text-xs leading-tight font-medium">{label}</span>
      </button>
    </li>
  )
}

function IconGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1 px-2 text-xs font-medium text-muted-foreground">{title}</h2>
      <ul className="flex flex-wrap gap-1">{children}</ul>
    </section>
  )
}

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className="flex flex-col gap-6 md:w-[25rem] md:shrink-0">
        <IconGroup title="Domains">
          {folders.map((folder) => {
            const count = appsInFolder(folder.id, apps).length
            return (
              <DesktopIcon
                key={folder.id}
                label={folder.name}
                detail={`folder, ${count} application${count === 1 ? '' : 's'}`}
                icon={<FolderIcon folderId={folder.id} />}
                onOpen={() => openApp('folder-browser', { folder: folder.id })}
              />
            )
          })}
        </IconGroup>
        <IconGroup title="Applications">
          <DesktopIcon
            label="Create Application"
            detail="opens Application Studio"
            icon={
              <span aria-hidden className="flex size-13 items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-card text-primary">
                <Plus className="size-6" />
              </span>
            }
            onOpen={() => openApp('application-studio', { new: String(Date.now()) })}
          />
          {desktopShortcuts(apps).map((app) => (
            <DesktopIcon
              key={app.id}
              label={app.name}
              detail="application"
              icon={<AppIcon app={app} size="lg" />}
              onOpen={() => openApp(app.id)}
            />
          ))}
        </IconGroup>
      </div>

      <div className="hidden flex-1 md:block" />

      <div className="md:no-scrollbar md:w-80 md:shrink-0 md:overflow-y-auto md:pb-2">
        <DesktopWidgets />
      </div>
    </div>
  )
}
