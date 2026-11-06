import { useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { useRuntime } from '@/app/runtime/store'
import { findAppIcon } from './registry-helpers'
import { folders } from '@/app/registry/applicationRegistry'
import type { DomainId } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import {
  filterEntries,
  listRegistryEntries,
  registryLifecycleMeta,
  type RegistryEntry,
  type RegistryLifecycle,
  type RegistrySort,
} from '@/app/services/mock/application-registry-service'
import { useStudio } from '@/app/studio/use-studio'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const lifecycles: RegistryLifecycle[] = ['published', 'changes-pending', 'ready', 'validating', 'designing', 'draft', 'preview']

const sourceLabel: Record<RegistryEntry['source'], string> = {
  'built-in': 'Built-in',
  generated: 'Published from Studio',
  draft: 'Studio draft',
}

/** Application registry: built-in, published and draft applications in one view. */
export function ApplicationRegistry({ onSelect }: { onSelect: (id: string) => void }) {
  const apps = useApplications()
  const { state } = useStudio()
  const { openApp } = useOs()
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState<DomainId | 'all'>('all')
  const [lifecycle, setLifecycle] = useState<RegistryLifecycle | 'all'>('all')
  const [sort, setSort] = useState<RegistrySort>('updated')

  useRuntime() // re-render when accepted improvements change a built-in app's lifecycle or version
  const entries = listRegistryEntries(apps, state.projects)
  const shown = filterEntries(entries, { query, domain, lifecycle, sort })

  const open = (e: RegistryEntry) => {
    if (e.appId) openApp(e.appId)
    else if (e.projectId) openApp('application-studio', { project: e.projectId })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full max-w-64">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applications" aria-label="Search applications" className="pl-8" />
        </div>
        <NativeSelect aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value as DomainId | 'all')}>
          <NativeSelectOption value="all">All domains</NativeSelectOption>
          {folders.map((f) => (
            <NativeSelectOption key={f.id} value={f.id}>
              {f.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Lifecycle" value={lifecycle} onChange={(e) => setLifecycle(e.target.value as RegistryLifecycle | 'all')}>
          <NativeSelectOption value="all">Any status</NativeSelectOption>
          {lifecycles.map((l) => (
            <NativeSelectOption key={l} value={l}>
              {registryLifecycleMeta[l].label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as RegistrySort)}>
          <NativeSelectOption value="updated">Last updated</NativeSelectOption>
          <NativeSelectOption value="name">Name</NativeSelectOption>
          <NativeSelectOption value="domain">Domain</NativeSelectOption>
          <NativeSelectOption value="status">Status</NativeSelectOption>
        </NativeSelect>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {shown.length} of {entries.length}
        </span>
      </div>

      {shown.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No applications match</EmptyTitle>
            <EmptyDescription>Try another search, domain or status.</EmptyDescription>
          </EmptyHeader>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setQuery('')
              setDomain('all')
              setLifecycle('all')
            }}
          >
            Clear filters
          </Button>
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-card" aria-label="Applications">
          {shown.map((e) => {
            const Icon = findAppIcon(e, apps)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  aria-label={`${e.name} — details`}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none focus-visible:underline"
                >
                  {Icon}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium hover:underline">{e.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{e.description}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {e.domains.length ? e.domains.map((d) => folders.find((f) => f.id === d)?.name).join(', ') : 'Cross-domain'} · v{e.version} · {e.owner} · updated{' '}
                      <span className="tabular-nums">{e.updatedAt ? dateFormat.format(new Date(e.updatedAt)) : '—'}</span> · {e.resourceIds.length} resource
                      {e.resourceIds.length === 1 ? '' : 's'} · {sourceLabel[e.source]}
                    </span>
                  </span>
                </button>
                <StatusBadge tone={registryLifecycleMeta[e.lifecycle].tone}>{registryLifecycleMeta[e.lifecycle].label}</StatusBadge>
                <Button size="xs" variant="outline" onClick={() => open(e)}>
                  {e.source === 'draft' ? 'Open in Studio' : 'Open'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
