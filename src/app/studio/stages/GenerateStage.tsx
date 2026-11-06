import { useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ApplicationBlueprint, DataField, FieldType, ResourceRef } from '@/app/blueprint/types'
import { ExperienceRenderer } from '@/app/experience/ExperienceRenderer'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { readinessMeta, readinessOf, sectionStatus } from '@/app/services/mock/blueprint-service'
import { getResource } from '@/app/services/mock/resource-discovery-service'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getScenario } from '@/data/studio-scenarios.mock'
import type { PlatformResource } from '@/data/resources.mock'
import { FileJson, FileText, GitBranch, History, LayoutDashboard, ListChecks, Monitor, Network, Rocket, Shield, ShieldCheck, Table2, Waypoints } from 'lucide-react'
import { FlowDiagram } from '../components/FlowDiagram'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { VersionHistory } from '../components/VersionHistory'
import type { BlueprintSection, StudioProject } from '../types'
import { useStudio } from '../use-studio'

export type GenerateTab = BlueprintSection | 'validation' | 'history' | 'json'

const nav: { id: GenerateTab; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requirements', label: 'Business requirements', icon: ListChecks },
  { id: 'solution', label: 'Selected solution', icon: Waypoints },
  { id: 'workflow', label: 'Workflow', icon: GitBranch },
  { id: 'resources', label: 'Resources', icon: Network },
  { id: 'data', label: 'Data model', icon: Table2 },
  { id: 'experience', label: 'Experience and screens', icon: Monitor },
  { id: 'security', label: 'Security and governance', icon: Shield },
  { id: 'validation', label: 'Validation', icon: ShieldCheck },
  { id: 'deployment', label: 'Deployment', icon: Rocket },
  { id: 'history', label: 'Version history', icon: History },
  { id: 'json', label: 'Technical view (JSON)', icon: FileJson },
]

const roleName = (bp: ApplicationBlueprint, id: string | null) => (id ? (bp.security.roles.find((r) => r.id === id)?.name ?? id) : null)

function summaryOf(tab: GenerateTab, bp: ApplicationBlueprint, project: StudioProject): string {
  const human = bp.workflow.nodes.filter((n) => n.actor === 'human')
  const resources = Object.values(bp.resources).flat()
  const entity = bp.dataModel.entities[0]
  switch (tab) {
    case 'overview':
      return bp.description
    case 'requirements':
      return `${bp.requirements.capabilities.length} capabilities for ${bp.requirements.users.length} user groups, with ${bp.requirements.constraints.length} constraints.`
    case 'solution':
      return bp.solutionArchitecture.summary
    case 'workflow':
      return `${bp.workflow.nodes.length} steps; people decide at ${human.length} of them.`
    case 'resources':
      return `${resources.length} resources pinned to exact versions${resources.some((r) => r.origin === 'created') ? `, ${resources.filter((r) => r.origin === 'created').length} composed for this application` : ''}.`
    case 'data':
      return `${entity?.name} record with ${entity?.fields.length} fields.`
    case 'experience':
      return `${bp.experience.pages.length} screens: ${bp.experience.pages.map((p) => p.title).join(', ')}.`
    case 'security':
      return `${bp.security.roles.length} roles and ${bp.security.approvals.length} approval rule${bp.security.approvals.length === 1 ? '' : 's'}; decision log ${bp.security.audit.decisionLog ? 'on' : 'off'}.`
    case 'validation':
      return readinessMeta[readinessOf(project)].description
    case 'deployment':
      return project.publication ? `Published v${project.publication.version} to the ${bp.deployment.folder} folder.` : `Not published yet. Target: desktop, ${bp.deployment.folder} folder.`
    default:
      return ''
  }
}

function statusOf(tab: GenerateTab, project: StudioProject): { label: string; tone: StatusTone } | null {
  if (tab === 'history' || tab === 'json') return null
  if (tab === 'validation') {
    const r = readinessOf(project)
    return { label: readinessMeta[r].label, tone: readinessMeta[r].tone }
  }
  return sectionStatus(tab, project)
}

function SectionHeader({ tab, project, children }: { tab: GenerateTab; project: StudioProject; children?: ReactNode }) {
  const status = statusOf(tab, project)
  const title = nav.find((n) => n.id === tab)?.label
  return (
    <header className="mb-5 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{summaryOf(tab, project.blueprint!, project)}</p>
      </div>
      {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      {children}
    </header>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="list-disc space-y-0.5 pl-5 text-sm">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">None.</p>
  )

// ── Sections ──────────────────────────────────────────────────────────────

function Overview({ project, onOpen }: { project: StudioProject; onOpen: (t: GenerateTab) => void }) {
  const bp = project.blueprint!
  return (
    <div className="space-y-5">
      <SectionHeader tab="overview" project={project} />
      <ul className="divide-y rounded-lg border bg-card" aria-label="Blueprint sections">
        {nav
          .filter((n) => !['overview', 'json'].includes(n.id))
          .map((n) => {
            const status = statusOf(n.id, project)
            const Icon = n.icon
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onOpen(n.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.label}</span>
                    <span className="block text-sm text-muted-foreground">{n.id === 'history' ? `${project.revisions.length} versions; current v${bp.version}.` : summaryOf(n.id, bp, project)}</span>
                  </span>
                  {status && status.label !== 'Not validated' && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                  <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                </button>
              </li>
            )
          })}
      </ul>
    </div>
  )
}

function Requirements({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const req = project.blueprint!.requirements
  return (
    <div className="space-y-5">
      <SectionHeader tab="requirements" project={project}>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: 'define' })}>
          Edit in Define
        </Button>
      </SectionHeader>
      <Block title="Business objective">
        <p className="text-sm">{req.objective}</p>
      </Block>
      {req.context?.problem && (
        <Block title="Problem statement">
          <p className="text-sm">{req.context.problem}</p>
        </Block>
      )}
      <div className="grid gap-5 @3xl:grid-cols-2">
        <Block title="Users">
          <List items={req.users.map((u) => u.label)} />
        </Block>
        <Block title="Capabilities">
          <List items={req.capabilities.map((c) => c.label)} />
        </Block>
        <Block title="Constraints">
          <List items={req.constraints.map((c) => c.label)} />
        </Block>
        <Block title="Success criteria">
          <List items={req.successCriteria.map((c) => c.label)} />
        </Block>
        <Block title="Inputs">
          <List items={req.inputs.map((c) => c.label)} />
        </Block>
        <Block title="Outputs">
          <List items={req.outputs.map((c) => c.label)} />
        </Block>
      </div>
    </div>
  )
}

function Solution({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const bp = project.blueprint!
  const option = project.architecture?.options.find((o) => o.id === bp.solutionArchitecture.optionId)
  return (
    <div className="space-y-5">
      <SectionHeader tab="solution" project={project}>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: 'architect' })}>
          Change in Architect
        </Button>
      </SectionHeader>
      <Block title="Approach">
        <p className="text-sm font-medium">{bp.solutionArchitecture.name}</p>
        {option?.operatingModel && <p className="text-sm">{option.operatingModel}</p>}
      </Block>
      {option?.howItAddresses && (
        <Block title="How it addresses the problem">
          <p className="text-sm">{option.howItAddresses}</p>
        </Block>
      )}
      <Block title="Human checkpoints">
        <List items={bp.solutionArchitecture.humanCheckpoints} />
      </Block>
      {option && (
        <div className="grid gap-5 @3xl:grid-cols-2">
          <Block title="Advantages">
            <List items={option.benefits} />
          </Block>
          <Block title="Trade-offs accepted">
            <List items={option.tradeOffs} />
          </Block>
        </div>
      )}
    </div>
  )
}

function Workflow({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const bp = project.blueprint!
  const resources = Object.values(bp.resources).flat()
  const entity = bp.dataModel.entities[0]
  const label = (id: string) => entity.fields.find((f) => f.id === id)?.label ?? id
  return (
    <div className="space-y-5">
      <SectionHeader tab="workflow" project={project} />
      <FlowDiagram label="Application workflow" steps={bp.workflow.nodes.map((n) => ({ id: n.id, name: n.name, actor: n.actor, capabilityId: n.capabilityId, role: n.role }))} roleLabel={(id) => roleName(bp, id) ?? id} />
      <ol className="space-y-2">
        {bp.workflow.nodes.map((n, i) => {
          const res = resources.find((r) => r.id === n.resourceId)
          return (
            <li key={n.id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.actor === 'human' ? 'Human decision' : n.actor === 'system' ? 'Rules or systems' : 'AI and automation'} · {res ? `${res.name} ${res.version}` : 'No resource'}
                  </p>
                </div>
                {n.actor === 'human' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`role-${n.id}`} className="text-xs text-muted-foreground">
                      Decided by
                    </label>
                    <NativeSelect
                      id={`role-${n.id}`}
                      size="sm"
                      value={n.role ?? ''}
                      aria-invalid={!n.role}
                      onChange={(e) =>
                        e.target.value &&
                        dispatch({ type: 'generate/patch', patch: { kind: 'assign-role', nodeId: n.id, role: e.target.value }, reason: 'Approver chosen in the Workflow section.', now: new Date().toISOString() })
                      }
                    >
                      <NativeSelectOption value="" disabled>
                        Choose a role…
                      </NativeSelectOption>
                      {bp.security.roles.map((r) => (
                        <NativeSelectOption key={r.id} value={r.id}>
                          {r.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>
              <p className="mt-1.5 pl-8 text-xs text-muted-foreground">
                Uses {n.inputs.length ? n.inputs.map(label).join(', ') : 'nothing'} · produces {n.outputs.length ? n.outputs.map(label).join(', ') : 'nothing'}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Resources({ project }: { project: StudioProject }) {
  const bp = project.blueprint!
  const [detail, setDetail] = useState<PlatformResource | null>(null)
  const lookup = (r: ResourceRef): PlatformResource | null =>
    getResource(r.id) ?? project.composition?.createdWorkers.find((w) => w.resource.id === r.id)?.resource ?? null
  const groups: [string, ResourceRef[]][] = [
    ['AI Workers', bp.resources.workers],
    ['Agents', bp.resources.agents],
    ['Connectors', bp.resources.connectors],
    ['Services', bp.resources.services],
    ['Domain knowledge', bp.resources.knowledge],
  ]
  const usedBy = (id: string) => bp.workflow.nodes.filter((n) => n.resourceId === id).map((n) => n.name)
  return (
    <div className="space-y-5">
      <SectionHeader tab="resources" project={project} />
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <Block key={title} title={title}>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(lookup(r))}
                    className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">pinned {r.version}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{usedBy(r.id).length ? `· ${usedBy(r.id).join(', ')}` : '· supports the whole application'}</span>
                    {r.origin === 'created' ? <StatusBadge tone="info">Composed for this app</StatusBadge> : <StatusBadge tone="neutral">Existing</StatusBadge>}
                  </button>
                </li>
              ))}
            </ul>
          </Block>
        ))}
      <ResourceDetailSheet
        resource={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        context={detail ? { label: 'Supports in this application', items: usedBy(detail.id) } : undefined}
      />
    </div>
  )
}

const fieldTypes: { id: FieldType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'longtext', label: 'Long text' },
  { id: 'money', label: 'Amount' },
  { id: 'date', label: 'Date' },
]

function DataModel({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const bp = project.blueprint!
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  return (
    <div className="space-y-5">
      <SectionHeader tab="data" project={project} />
      {bp.dataModel.entities.map((entity) => (
        <div key={entity.id} className="space-y-3">
          <table className="w-full rounded-lg border bg-card text-sm">
            <caption className="sr-only">{entity.name} fields</caption>
            <thead className="bg-chrome text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="hidden px-3 py-2 font-medium @3xl:table-cell">Technical id</th>
              </tr>
            </thead>
            <tbody>
              {entity.fields.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{f.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground @3xl:table-cell">{f.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const clean = label.trim()
              if (!clean) return
              const id = clean
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')
                .filter(Boolean)
                .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
                .join('')
              const field: DataField = { id, label: clean, type }
              dispatch({ type: 'generate/patch', patch: { kind: 'add-field', entityId: entity.id, field }, reason: 'Field added in the Data model section.', now: new Date().toISOString() })
              setLabel('')
            }}
          >
            <div>
              <label htmlFor="new-field" className="mb-1 block text-xs text-muted-foreground">
                New field
              </label>
              <Input id="new-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Investigation notes" className="w-56" />
            </div>
            <NativeSelect aria-label="Field type" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
              {fieldTypes.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline" disabled={!label.trim()}>
              <Plus />
              Add field
            </Button>
          </form>
        </div>
      ))}
    </div>
  )
}

function Experience({ project }: { project: StudioProject }) {
  const bp = project.blueprint!
  const scenario = getScenario(project.scenarioId)
  return (
    <div className="space-y-5">
      <SectionHeader tab="experience" project={project} />
      <ul className="grid gap-2 @3xl:grid-cols-2">
        {bp.experience.pages.map((p) => (
          <li key={p.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="font-medium">{p.title}</p>
            <p className="text-muted-foreground">{p.purpose}</p>
            <p className="mt-1 text-xs text-muted-foreground">For {p.roles.map((r) => roleName(bp, r) ?? r).join(', ')}</p>
          </li>
        ))}
      </ul>
      <Block title="Preview">
        <p className="text-sm text-muted-foreground">
          Built from the blueprint’s screens with the trusted component catalogue — the same renderer the published application uses. Sample records are mock data.
        </p>
        <div className="h-[34rem] overflow-hidden rounded-xl border bg-card shadow-widget">
          <ExperienceRenderer key={bp.version} blueprint={bp} initialRecords={scenario?.sampleRecords ?? []} />
        </div>
      </Block>
    </div>
  )
}

function Security({ project }: { project: StudioProject }) {
  const bp = project.blueprint!
  return (
    <div className="space-y-5">
      <SectionHeader tab="security" project={project} />
      <Block title="Roles and what they can do">
        <ul className="divide-y rounded-lg border bg-card">
          {bp.security.roles.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {r.permissions.length
                  ? r.permissions
                      .map((p) => {
                        const [verb, target] = p.split(':')
                        const name = bp.experience.pages.find((pg) => pg.id === target)?.title ?? bp.workflow.nodes.find((n) => n.id === target)?.name ?? target
                        return `${verb === 'view' ? 'Uses' : 'Decides'} ${name}`
                      })
                      .join(' · ')
                  : 'No screens or decisions assigned'}
              </p>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Approval rules">
        <ul className="divide-y rounded-lg border bg-card">
          {bp.security.approvals.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{a.description}</span>
              {a.role ? <StatusBadge tone="neutral">{roleName(bp, a.role)}</StatusBadge> : <StatusBadge tone="danger">No approver assigned</StatusBadge>}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Audit">
        <p className="text-sm">
          Decision log: {bp.security.audit.decisionLog ? 'enabled for every human decision' : 'not required by the specification'} · Document retention: {bp.security.audit.retention}
        </p>
      </Block>
      {project.decisions.length > 0 && (
        <Block title="Decisions recorded in this draft">
          <ul className="space-y-1 text-sm">
            {[...project.decisions].reverse().slice(0, 8).map((d) => (
              <li key={d.id} className="flex gap-3">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{new Date(d.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  )
}

function Validation({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const findings = project.validation?.findings ?? []
  const readiness = readinessOf(project)
  return (
    <div className="space-y-5">
      <SectionHeader tab="validation" project={project}>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: 'validate' })}>
          Open Validate
        </Button>
      </SectionHeader>
      {readiness === 'not-validated' || readiness === 'outdated' ? (
        <p className="text-sm text-muted-foreground">{readinessMeta[readiness].description}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {findings
            .filter((f) => f.status !== 'passed')
            .map((f) => (
              <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1">{f.title}</span>
                <StatusBadge tone={project.validation!.acknowledged.includes(f.id) ? 'info' : f.status === 'blocked' ? 'danger' : 'warning'}>
                  {project.validation!.acknowledged.includes(f.id) ? 'Accepted' : f.status === 'blocked' ? 'Blocked' : 'Needs attention'}
                </StatusBadge>
              </li>
            ))}
          <li className="px-3 py-2 text-sm text-muted-foreground">{findings.filter((f) => f.status === 'passed').length} checks passed.</li>
        </ul>
      )}
    </div>
  )
}

function Deployment({ project }: { project: StudioProject }) {
  const bp = project.blueprint!
  return (
    <div className="space-y-5">
      <SectionHeader tab="deployment" project={project} />
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border bg-card p-4 text-sm @3xl:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Destination</dt>
          <dd>Enterprise AI OS desktop · {bp.deployment.folder} folder</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Runtime</dt>
          <dd>Enterprise AI OS runtime</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Application id</dt>
          <dd className="tabular-nums">{bp.applicationId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Domain pack</dt>
          <dd>{bp.domainPack.id} {bp.domainPack.version}</dd>
        </div>
      </dl>
      <Block title="Publication history">
        {project.publications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not published yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...project.publications].reverse().map((p) => (
              <li key={p.publishedAt}>
                v{p.version} · {new Date(p.publishedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  )
}

function Json({ bp }: { bp: ApplicationBlueprint }) {
  const json = JSON.stringify(bp, null, 2)
  return (
    <div className="space-y-2">
      <header className="mb-3">
        <h3 className="text-base font-semibold">Technical view (JSON)</h3>
        <p className="text-xs text-muted-foreground">Schema {bp.schemaVersion}</p>
      </header>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(json)
            toast.success('Blueprint JSON copied')
          } catch {
            toast.error('Could not copy — select the text instead')
          }
        }}
      >
        <Copy />
        Copy JSON
      </Button>
      <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed">{json}</pre>
    </div>
  )
}

export function GenerateStage({ tab, onTabChange }: { tab: GenerateTab; onTabChange: (t: GenerateTab) => void }) {
  const { project, dispatch } = useStudio()
  if (!project?.blueprint) {
    return <StagePrerequisite stage="generate" requires="compose" message="Select the resources the approach needs first. The blueprint is compiled from them." />
  }
  const bp = project.blueprint

  const content = () => {
    switch (tab) {
      case 'overview':
        return <Overview project={project} onOpen={onTabChange} />
      case 'requirements':
        return <Requirements project={project} />
      case 'solution':
        return <Solution project={project} />
      case 'workflow':
        return <Workflow project={project} />
      case 'resources':
        return <Resources project={project} />
      case 'data':
        return <DataModel project={project} />
      case 'experience':
        return <Experience project={project} />
      case 'security':
        return <Security project={project} />
      case 'validation':
        return <Validation project={project} />
      case 'deployment':
        return <Deployment project={project} />
      case 'history':
        return (
          <div className="space-y-5">
            <header>
              <h3 className="text-base font-semibold">Version history</h3>
            </header>
            <VersionHistory
              revisions={project.revisions}
              publications={project.publications}
              currentVersion={bp.version}
              onRollback={(version) => {
                dispatch({ type: 'generate/rollback', version, now: new Date().toISOString() })
                toast.success(`Restored v${version} as a new draft version`, { description: 'Validate and publish again to make it live.' })
              }}
            />
          </div>
        )
      case 'json':
        return <Json bp={bp} />
    }
  }

  return (
    <StageFrame
      stage="generate"
      aside={
        <div className="flex items-center gap-2">
          <StatusBadge tone={bp.status === 'draft' ? 'neutral' : 'success'}>{bp.status === 'draft' ? 'Draft' : bp.status === 'validated' ? 'Validated' : 'Published'}</StatusBadge>
          <span className="text-sm font-medium tabular-nums">v{bp.version}</span>
        </div>
      }
      footer={
        <Button onClick={() => dispatch({ type: 'generate/confirm' })}>
          Continue to validation
          <ArrowRight />
        </Button>
      }
    >
      <div className="flex flex-col gap-6 @4xl:flex-row">
        <div className="@4xl:w-56 @4xl:shrink-0 [&>nav]:rounded-lg [&>nav]:border @4xl:[&>nav]:w-full">
          <SidebarNav label="Blueprint sections" items={nav} value={tab} onChange={onTabChange} />
        </div>
        <div className="min-w-0 flex-1">{content()}</div>
      </div>
    </StageFrame>
  )
}
