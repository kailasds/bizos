import { Blocks } from 'lucide-react'
import type { AppDefinition } from '@/app/registry/types'
import type { RegistryEntry } from '@/app/services/mock/application-registry-service'
import { AppIcon } from '@/components/os/AppIcon'

/** Icon for a registry entry: the app's own icon, or a neutral one for drafts. */
export function findAppIcon(entry: RegistryEntry, apps: AppDefinition[]) {
  const app = entry.appId ? apps.find((a) => a.id === entry.appId) : undefined
  return app ? (
    <AppIcon app={app} size="sm" />
  ) : (
    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed bg-card text-muted-foreground">
      <Blocks className="size-4" />
    </span>
  )
}
