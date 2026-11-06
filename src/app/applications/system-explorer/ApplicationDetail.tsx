import { useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { FlowStep } from '@/app/blueprint/types'
import { useOs } from '@/app/os/use-os'
import { appSummary } from '@/app/runtime/observability'
import { isRunnable } from '@/app/runtime/runtime-apps'
import { useRuntime } from '@/app/runtime/store'
import { folders, getGeneratedApp } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { formatActivityTime, platformActivity } from '@/app/services/mock/activity-service'
import { listRegistryEntries, registryLifecycleMeta } from '@/app/services/mock/application-registry-service'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { getResource } from '@/app/services/mock/resource-discovery-service'
import { FlowDiagram } from '@/app/studio/components/FlowDiagram'
import { LifecycleTrack } from '@/app/studio/components/LifecycleTrack'
import { VersionHistory } from '@/app/studio/components/VersionHistory'
import { lifecycleOf, nextAction } from '@/app/studio/lifecycle'
import { useStudio } from '@/app/studio/use-studio'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { appProfileFor } from '@/data/applications.mock'
import { workflowDefinitions } from '@/data/platform.mock'
import { resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { findAppIcon } from './registry-helpers'

const kindToActor = { agent: 'automated', worker: 'automated', rule: 'system', connector: 'system', human: 'human' } as const
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Application detail — a view over the registry, blueprint and Studio draft; not a second model. */
export function ApplicationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const apps = useApplications()
  const { state } = useStudio()
  const { openApp } = useOs()
  const [resource, setResource] = useState<PlatformResource | null>(null)
  const runtime = useRuntime()
  const entry = listRegistryEntries(apps, state.projects).find((e) => e.id === id)

  if (!entry) {
    return (
      <Empty className="rounded-lg border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Application not found</EmptyTitle>
          <EmptyDescription>It may have been removed when demo data was reset.</EmptyDescription>
        </EmptyHeader>
        <Button size="sm" variant="outline" onClick={onBack}>
          Back to the registry
        </Button>
      </Empty>
    )
  }

  const profile = appProfileFor(entry.id)
  const record = entry.appId ? getGeneratedApp(entry.appId) : undefined
  const project = state.projects.find((p) => p.id === entry.projectId)
  const blueprint = project?.blueprint ?? record?.blueprint ?? null
  const definition = profile?.workflowId ? workflowDefinitions.find((w) => w.id === profile.workflowId) : undefined

  const steps: FlowStep[] = blueprint
    ? blueprint.workflow.nodes.map((n) => ({ id: n.id, name: n.name, actor: n.actor, capabilityId: n.capabilityId, role: n.role }))
    : (definition?.steps.map((s, i) => ({ id: `s${i}`, name: s.name, actor: kindToActor[s.kind], capabilityId: s.kind, role: s.kind === 'human' ? s.resource : null })) ?? [])
  const roleLabel = (r: string) => blueprint?.security.roles.find((x) => x.id === r)?.name ?? r

  const resources: PlatformResource[] = entry.resourceIds
    .map((rid) => getResource(rid) ?? project?.composition?.createdWorkers.find((w) => w.resource.id === rid)?.resource)
    .filter((r): r is PlatformResource => Boolean(r))

  const activity = platformActivity(state.projects).filter(
    (a) => (entry.appId && a.appId === entry.appId) || (project && a.summary.startsWith(`${project.name}`)),
  )
  const next = project ? nextAction(project) : null

  return (
    <div className="space-y-6">
      <Button size="sm" variant="ghost" onClick={onBack} className="-ml-2">
        <ArrowLeft />
        All applications
      </Button>

      <header className="flex flex-wrap items-start gap-3">
        {findAppIcon(entry, apps)}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{entry.name}</h3>
          <p className="text-sm text-muted-foreground">
            {entry.domains.length ? entry.domains.map((d) => folders.find((f) => f.id === d)?.name).join(', ') : 'Cross-domain'} · v{entry.version} · Owner: {entry.owner}
          </p>
        </div>
        <StatusBadge tone={registryLifecycleMeta[entry.lifecycle].tone}>{registryLifecycleMeta[entry.lifecycle].label}</StatusBadge>
        <div className="flex flex-wrap gap-2">
          {entry.appId && <Button size="sm" onClick={() => openApp(entry.appId!)}>Open application</Button>}
          {entry.projectId && (
            <Button size="sm" variant="outline" onClick={() => openApp('application-studio', { project: entry.projectId! })}>
              Open in Studio
            </Button>
          )}
        </div>
      </header>

      <Section title="Purpose">
        <p className="text-sm">{entry.description}</p>
      </Section>

      {project && (
        <Section title="Status">
          <LifecycleTrack lifecycle={lifecycleOf(project)} />
          <p className="text-sm text-muted-foreground">
            Readiness: {readinessMeta[readinessOf(project)].label}.{next ? ` Next: ${next.label}.` : ''}
          </p>
        </Section>
      )}

      <Section title="Business workflow">
        {steps.length ? (
          <FlowDiagram label={`${entry.name} workflow`} steps={steps} roleLabel={roleLabel} />
        ) : (
          <p className="text-sm text-muted-foreground">No workflow defined{project && !project.blueprint ? ' yet — the blueprint has not been generated' : ''}.</p>
        )}
      </Section>

      <Section title="Associated resources" aside={<MockBadge label="Mock records" />}>
        {resources.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {resources.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setResource(r)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">· {resourceKindLabel[r.kind]} · {r.version}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{r.owner}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No resources recorded.</p>
        )}
      </Section>

      <Section title="Version history">
        {project ? (
          <>
            <VersionHistory revisions={project.revisions} publications={project.publications} currentVersion={project.blueprint?.version ?? null} />
            <p className="text-xs text-muted-foreground">To restore a version, open the draft in Application Studio.</p>
          </>
        ) : profile ? (
          <ol className="divide-y rounded-lg border bg-card">
            {profile.versions.map((v, i) => (
              <li key={v.version} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="font-semibold tabular-nums">v{v.version}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{dateFormat.format(new Date(v.date))}</span>
                {i === 0 && <StatusBadge tone="success">Current</StatusBadge>}
                <span className="w-full">{v.summary}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No history recorded.</p>
        )}
      </Section>

      <Section title="Governance">
        {blueprint ? (
          <dl className="grid gap-3 text-sm @3xl:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Roles</dt>
              <dd>{blueprint.security.roles.map((r) => r.name).join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Human approvals</dt>
              <dd>{blueprint.security.approvals.map((a) => `${a.description} — ${a.role ? roleLabel(a.role) : 'no approver yet'}`).join('; ') || 'None'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Decision log</dt>
              <dd>{blueprint.security.audit.decisionLog ? 'Enabled' : 'Not required'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Known gaps accepted</dt>
              <dd>{project?.decisions.filter((d) => d.kind === 'gap-accepted').length ?? 0}</dd>
            </div>
          </dl>
        ) : profile ? (
          <dl className="grid gap-3 text-sm @3xl:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Data classification</dt>
              <dd>{profile.governance.dataClassification}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Human approvals</dt>
              <dd>{profile.governance.approvals.join('; ') || 'None'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Decision log</dt>
              <dd>{profile.governance.auditLog ? 'Enabled' : 'Not required'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Governance is defined when the blueprint is generated.</p>
        )}
      </Section>

      {entry.appId && isRunnable(entry.appId, runtime) && (
        <Section title="Operations">
          {(() => {
            const s = appSummary(runtime, entry.appId)
            return (
              <p className="text-sm">
                {s.total} executions · {s.inProgress} in progress · {s.waiting} waiting for approval · {s.failed} failed · {s.completed} completed · {s.humanDecisions} human decisions
              </p>
            )
          })()}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Operational details">
            {(
              [
                ['overview', 'Overview'],
                ['executions', 'Executions'],
                ['resources', 'Resources'],
                ['governance', 'Governance'],
                ['activity', 'Activity'],
                ['outcomes', 'Outcomes'],
              ] as const
            ).map(([tab, label]) => (
              <Button key={tab} size="xs" variant="outline" onClick={() => openApp('operations', { section: 'applications', app: entry.appId!, tab })}>
                {label}
              </Button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Recent activity">
        {activity.length ? (
          <ol className="divide-y rounded-lg border bg-card">
            {activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3 px-3 py-2 text-sm">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{formatActivityTime(a.at)}</span>
                <span className="min-w-0 flex-1">{a.summary}</span>
                {a.simulated && <span className="shrink-0 text-xs text-muted-foreground">Simulated</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded.</p>
        )}
      </Section>

      <ResourceDetailSheet resource={resource} onOpenChange={(o) => !o && setResource(null)} />
    </div>
  )
}
