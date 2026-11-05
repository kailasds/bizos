/**
 * Application registry view: built-in applications, published (generated) applications
 * and Studio drafts, derived from the existing registry store and Studio projects.
 * There is no separate application model to keep in sync.
 */

import { getGeneratedApp } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppId, DomainId } from '@/app/registry/types'
import { lifecycleMeta, lifecycleOf } from '@/app/studio/lifecycle'
import type { Lifecycle, StudioProject } from '@/app/studio/types'
import type { StatusTone } from '@/components/os/StatusBadge'
import { appProfileFor } from '@/data/applications.mock'

export type RegistryLifecycle = Lifecycle | 'preview'

export const registryLifecycleMeta: Record<RegistryLifecycle, { label: string; tone: StatusTone }> = {
  ...Object.fromEntries(Object.entries(lifecycleMeta).map(([k, v]) => [k, { label: v.label, tone: v.tone }])),
  preview: { label: 'Preview', tone: 'info' },
} as Record<RegistryLifecycle, { label: string; tone: StatusTone }>

export interface RegistryEntry {
  /** App id for registered applications, project id for drafts. */
  id: string
  source: 'built-in' | 'generated' | 'draft'
  appId?: AppId
  projectId?: string
  name: string
  description: string
  domains: DomainId[]
  version: string
  lifecycle: RegistryLifecycle
  updatedAt: string
  owner: string
  resourceIds: string[]
}

export function listRegistryEntries(apps: AppDefinition[], projects: StudioProject[]): RegistryEntry[] {
  const builtIn = apps
    .filter((a) => a.kind === 'application' && !a.generated)
    .map((a): RegistryEntry => {
      const profile = appProfileFor(a.id)
      return {
        id: a.id,
        source: 'built-in',
        appId: a.id,
        name: a.name,
        description: profile?.purpose ?? a.description,
        domains: a.domains,
        version: a.version,
        lifecycle: a.lifecycle === 'preview' ? 'preview' : 'published',
        updatedAt: profile?.updatedAt ?? '2026-11-01T00:00:00Z',
        owner: a.owner,
        resourceIds: profile?.resources ?? [],
      }
    })
  const generated = apps
    .filter((a) => a.generated)
    .map((a): RegistryEntry => {
      const record = getGeneratedApp(a.id)
      const project = projects.find((p) => p.id === record?.projectId)
      return {
        id: a.id,
        source: 'generated',
        appId: a.id,
        projectId: record?.projectId,
        name: a.name,
        description: record?.description ?? a.description,
        domains: a.domains,
        version: a.version,
        lifecycle: project ? lifecycleOf(project) : 'published',
        updatedAt: project?.updatedAt ?? record?.publishedAt ?? '',
        owner: 'You (Application Studio)',
        resourceIds: record ? Object.values(record.blueprint.resources).flat().map((r) => r.id) : [],
      }
    })
  const drafts = projects
    .filter((p) => !p.publication)
    .map((p): RegistryEntry => ({
      id: p.id,
      source: 'draft',
      projectId: p.id,
      name: p.name,
      description: p.blueprint?.description ?? p.discover.understanding?.summary ?? p.discover.prompt,
      domains: p.discover.domain ? [p.discover.domain] : [],
      version: p.blueprint?.version ?? '—',
      lifecycle: lifecycleOf(p),
      updatedAt: p.updatedAt,
      owner: 'You (Application Studio)',
      resourceIds: p.composition?.mappings.filter((m) => m.status === 'selected' && m.resource).map((m) => m.resource!.id) ?? [],
    }))
  return [...builtIn, ...generated, ...drafts]
}

export type RegistrySort = 'updated' | 'name' | 'domain'

export function filterEntries(
  entries: RegistryEntry[],
  { query, domain, lifecycle, sort }: { query: string; domain: DomainId | 'all'; lifecycle: RegistryLifecycle | 'all'; sort: RegistrySort },
): RegistryEntry[] {
  const q = query.trim().toLowerCase()
  return entries
    .filter((e) => domain === 'all' || e.domains.includes(domain))
    .filter((e) => lifecycle === 'all' || e.lifecycle === lifecycle)
    .filter((e) => !q || [e.name, e.description, e.owner].some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'domain'
          ? (a.domains[0] ?? 'zz').localeCompare(b.domains[0] ?? 'zz') || a.name.localeCompare(b.name)
          : b.updatedAt.localeCompare(a.updatedAt),
    )
}
