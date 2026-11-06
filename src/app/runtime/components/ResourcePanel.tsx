import { useState } from 'react'
import { ArrowLeft, BookOpen, Bot, Cpu, Plug, Server, type LucideIcon } from 'lucide-react'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { getResource } from '@/app/services/mock/resource-discovery-service'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import type { ResourceActivity } from '../observability'
import { formatDateTime, stepStatusMeta, useRuntimeLinks } from './meta'

const kindIcon: Record<string, LucideIcon> = { agent: Bot, worker: Cpu, connector: Plug, service: Server, knowledge: BookOpen }

/**
 * What a worker or agent is doing for published applications. The OS displays operational
 * information; lifecycle management stays with the owning platform.
 */
export function ResourceList({ resources, onOpen, appName }: { resources: ResourceActivity[]; onOpen: (id: string) => void; appName: (id: string) => string }) {
  return (
    <ul aria-label="Resources" className="divide-y rounded-lg border bg-card">
      {resources.map((r) => {
        const Icon = kindIcon[r.kind] ?? Server
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 basis-48">
                <span className="block text-sm font-medium">
                  {r.name} <span className="font-normal text-muted-foreground">· v{r.version}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.owner} · used by {r.appIds.map(appName).join(', ')}
                </span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {r.invocations.length} invocation{r.invocations.length === 1 ? '' : 's'}
                {r.running ? ` · ${r.running} running` : ''}
              </span>
              {r.errors.length > 0 && <StatusBadge tone="danger">{r.errors.length} error{r.errors.length === 1 ? '' : 's'}</StatusBadge>}
              {!r.available && <StatusBadge tone="warning">{r.availability}</StatusBadge>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ResourceDetailPanel({ resource, appName, onBack }: { resource: ResourceActivity; appName: (id: string) => string; onBack?: () => void }) {
  const links = useRuntimeLinks()
  const [sheet, setSheet] = useState(false)
  const catalogue = getResource(resource.id) ?? null
  const recent = [...resource.invocations].sort((a, b) => (b.step.startedAt ?? '').localeCompare(a.step.startedAt ?? '')).slice(0, 8)
  return (
    <div className="space-y-4">
      {onBack && (
        <Button size="xs" variant="ghost" className="-ml-2" onClick={onBack}>
          <ArrowLeft /> All resources
        </Button>
      )}
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{resource.name}</h3>
          <p className="text-sm text-muted-foreground">
            {resource.kind} · v{resource.version} · owned by {resource.owner}
          </p>
        </div>
        <StatusBadge tone={resource.available ? 'success' : 'warning'}>{resource.availability}</StatusBadge>
        {catalogue && (
          <Button size="sm" variant="outline" onClick={() => setSheet(true)}>
            Catalogue details
          </Button>
        )}
      </header>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 text-sm @2xl:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Applications using it</dt>
          <dd>
            {resource.appIds.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openApplication(id)}>
                  {appName(id)}
                </button>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Invocations</dt>
          <dd className="tabular-nums">{resource.invocations.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Running now</dt>
          <dd className="tabular-nums">{resource.running}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last activity</dt>
          <dd>{formatDateTime(resource.lastAt)}</dd>
        </div>
      </dl>
      <section aria-label="Recent errors" className="space-y-1">
        <h4 className="text-sm font-semibold">Recent errors</h4>
        {resource.errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors recorded for this resource.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {resource.errors.map(({ execution, step }) => (
              <li key={step.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  {step.error?.what}
                  <span className="block text-xs text-muted-foreground">
                    {execution.transaction.id} · {formatDateTime(step.endedAt)}
                  </span>
                </span>
                <Button size="xs" variant="outline" onClick={() => links.openExecution(execution.id)}>
                  Open {execution.id}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Recent executions" className="space-y-1">
        <h4 className="text-sm font-semibold">Recent executions</h4>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not invoked yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {recent.map(({ execution, step }) => (
              <li key={step.id}>
                <button type="button" onClick={() => links.openExecution(execution.id)} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    {execution.transaction.id} · {step.name}
                    <span className="block text-xs text-muted-foreground">
                      {execution.id} · {appName(execution.appId)} · {formatDateTime(step.startedAt)}
                    </span>
                  </span>
                  <StatusBadge tone={stepStatusMeta[step.status].tone}>{stepStatusMeta[step.status].label}</StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">Operational view only. Versions, availability and lifecycle are managed by {resource.owner}.</p>
      <ResourceDetailSheet resource={sheet ? catalogue : null} onOpenChange={(o) => !o && setSheet(false)} />
    </div>
  )
}
