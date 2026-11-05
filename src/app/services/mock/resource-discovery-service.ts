/**
 * MOCK — Resource discovery over the mock catalogue (resources.mock.ts).
 * Read-only: the source platforms own these records.
 */

import type { ResourceKind } from '@/app/blueprint/types'
import { getGeneratedApp } from '@/app/registry/applicationRegistry'
import type { AppDefinition, DomainId } from '@/app/registry/types'
import type { StudioProject } from '@/app/studio/types'
import { appProfiles } from '@/data/applications.mock'
import { platformResources, type PlatformResource } from '@/data/resources.mock'

export function getResource(id: string): PlatformResource | undefined {
  return platformResources.find((r) => r.id === id)
}

export function searchCatalogue({ query = '', kind, domain }: { query?: string; kind?: ResourceKind | 'all'; domain?: DomainId }): PlatformResource[] {
  const q = query.trim().toLowerCase()
  return platformResources.filter(
    (r) =>
      (!kind || kind === 'all' || r.kind === kind) &&
      (!domain || r.domains === 'all' || r.domains.includes(domain)) &&
      (!q || [r.name, r.purpose, ...r.responsibilities].some((t) => t.toLowerCase().includes(q))),
  )
}

export interface ResourceUsage {
  name: string
  kind: 'built-in' | 'published' | 'draft'
  appId?: string
  projectId?: string
}

/** Applications (built-in, published, drafts) that use a resource. */
export function resourceUsage(resourceId: string, apps: AppDefinition[], projects: StudioProject[]): ResourceUsage[] {
  const usage: ResourceUsage[] = []
  for (const profile of appProfiles) {
    const app = apps.find((a) => a.id === profile.appId)
    if (app && profile.resources.includes(resourceId)) usage.push({ name: app.name, kind: 'built-in', appId: app.id })
  }
  for (const app of apps.filter((a) => a.generated)) {
    const record = getGeneratedApp(app.id)
    if (record && Object.values(record.blueprint.resources).flat().some((r) => r.id === resourceId)) {
      usage.push({ name: app.name, kind: 'published', appId: app.id })
    }
  }
  for (const p of projects) {
    if (p.publication) continue
    if (p.composition?.mappings.some((m) => m.resource?.id === resourceId && m.status === 'selected')) {
      usage.push({ name: p.name, kind: 'draft', projectId: p.id })
    }
  }
  return usage
}
