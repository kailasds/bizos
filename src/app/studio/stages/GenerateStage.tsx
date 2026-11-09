import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ApplicationBlueprint, DataField, FieldType, ResourceRef } from '@/app/blueprint/types'
import { ExperienceRenderer } from '@/app/experience/ExperienceRenderer'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { sectionStatus } from '@/app/services/mock/blueprint-service'
import { getResource } from '@/app/services/mock/resource-discovery-service'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getScenario } from '@/data/studio-scenarios.mock'
import type { PlatformResource } from '@/data/resources.mock'
import { Blocks, ChevronDown, FileJson, FileText, GitBranch, History, LayoutDashboard, ListChecks, Monitor, Network, Rocket, Shield, Table2, Waypoints } from 'lucide-react'
import { ApproachFlow } from '../components/ApproachFlow'
import { kindIcon } from '../components/compose/flow-meta'
import { ActorBar, ctaClass, IconTile } from '../components/StudioParts'
import { actorMeta } from '../components/actor-meta'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { VersionHistory } from '../components/VersionHistory'
import type { BlueprintSection, StudioProject } from '../types'
import { useStudio } from '../use-studio'

export type GenerateTab = BlueprintSection | 'history' | 'json'

const nav: { id: GenerateTab; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requirements', label: 'Business requirements', icon: ListChecks },
  { id: 'solution', label: 'Selected solution', icon: Waypoints },
  { id: 'workflow', label: 'Workflow', icon: GitBranch },
  { id: 'resources', label: 'Resources', icon: Network },
  { id: 'data', label: 'Data model', icon: Table2 },
  { id: 'experience', label: 'Experience and screens', icon: Monitor },
  { id: 'security', label: 'Security and governance', icon: Shield },
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
      return `${bp.requirements.capabilities.length} capabilities · ${bp.requirements.users.length} user groups · ${bp.requirements.constraints.length} constraints`
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
    case 'deployment':
      return project.publication ? `Published v${project.publication.version} to the ${bp.deployment.folder} folder.` : `Not published yet. Target: desktop, ${bp.deployment.folder} folder.`
    default:
      return ''
  }
}

function statusOf(tab: GenerateTab, project: StudioProject): { label: string; tone: StatusTone } | null {
  if (tab === 'history' || tab === 'json') return null
  const status = sectionStatus(tab, project)
  return status.label === 'Not checked' ? null : status
}

function SectionHeader({ tab, project, children }: { tab: GenerateTab; project: StudioProject; children?: ReactNode }) {
  const status = statusOf(tab, project)
  const title = nav.find((n) => n.id === tab)?.label
  return (
    <header className="mb-5 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="line-clamp-2 text-[13px] text-muted-foreground">{summaryOf(tab, project.blueprint!, project)}</p>
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
    <ul className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li key={i} className="rounded-xl border border-studio-ink/10 bg-white px-2.5 py-1 text-[13px] leading-tight">
          {i}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">None.</p>
  )

// ── Sections ──────────────────────────────────────────────────────────────

/** A small picture of each section, drawn from the blueprint itself. */
function SectionGlyph({ tab, project }: { tab: GenerateTab; project: StudioProject }) {
  const bp = project.blueprint!
  const resources = Object.values(bp.resources).flat()
  switch (tab) {
    case 'workflow':
      return (
        <span aria-hidden className="flex w-full items-center">
          {bp.workflow.nodes.map((n, i) => {
            const Icon = actorMeta[n.actor].icon
            return (
              <span key={n.id} className="flex min-w-0 flex-1 items-center last:flex-none">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-[9px]', actorMeta[n.actor].tile)}>
                  <Icon className="size-3.5" />
                </span>
                {i < bp.workflow.nodes.length - 1 && <span className="h-0.5 min-w-1 flex-1 bg-studio-ink/15" />}
              </span>
            )
          })}
        </span>
      )
    case 'experience':
      return (
        <span aria-hidden className="flex gap-1.5">
          {bp.experience.pages.slice(0, 5).map((pg) => (
            <span key={pg.id} className="flex h-12 w-16 flex-col gap-1 rounded-lg border border-studio-ink/10 bg-white p-1.5">
              <span className="h-1 w-2/3 rounded-full bg-actor-ai/60" />
              <span className="h-1 w-full rounded-full bg-studio-ink/10" />
              <span className="h-1 w-full rounded-full bg-studio-ink/10" />
              <span className="h-1 w-1/2 rounded-full bg-studio-ink/10" />
            </span>
          ))}
        </span>
      )
    case 'data':
      return (
        <span aria-hidden className="grid w-24 grid-cols-3 gap-0.5">
          {(bp.dataModel.entities[0]?.fields ?? []).slice(0, 12).map((f) => (
            <span key={f.id} className="h-1.5 rounded-[2px] bg-actor-system/50" />
          ))}
        </span>
      )
    case 'resources':
      return (
        <span aria-hidden className="flex -space-x-1.5">
          {resources.slice(0, 7).map((r) => {
            const Icon = kindIcon[r.kind]
            return (
              <span key={r.id} className={cn('flex size-7 items-center justify-center rounded-full text-white ring-2 ring-white', r.origin === 'created' ? 'bg-tint-teal' : 'bg-actor-ai')}>
                <Icon className="size-3" />
              </span>
            )
          })}
        </span>
      )
    case 'requirements':
      return (
        <span aria-hidden className="flex flex-wrap gap-1">
          {bp.requirements.capabilities.slice(0, 5).map((c, i) => (
            <span key={c.id} className="h-2 rounded-full bg-actor-ai/50" style={{ width: `${18 + ((i * 11) % 26)}px` }} />
          ))}
          {bp.requirements.users.slice(0, 3).map((u) => (
            <span key={u.id} className="h-2 w-4 rounded-full bg-actor-person/70" />
          ))}
        </span>
      )
    case 'deployment':
      return (
        <span aria-hidden className="flex items-center gap-1.5 text-studio-ink/60">
          <Blocks className="size-4" />
          <span className="h-0.5 w-6 rounded-full bg-studio-ink/20" />
          <Monitor className="size-4" />
        </span>
      )
    case 'security':
      return (
        <span aria-hidden className="flex -space-x-1.5">
          {bp.security.roles.slice(0, 5).map((r) => (
            <span key={r.id} className="flex size-6 items-center justify-center rounded-full bg-actor-person-soft text-[9px] font-bold text-warning-ink ring-2 ring-white">
              {r.name[0]}
            </span>
          ))}
        </span>
      )
    case 'solution': {
      const count = (a: string) => bp.workflow.nodes.filter((n) => n.actor === a).length
      return <ActorBar className="w-28" people={count('human')} ai={count('automated')} system={count('system')} />
    }
    case 'history':
      return (
        <span aria-hidden className="flex items-center gap-1">
          {project.revisions.slice(-6).map((r, i, all) => (
            <span key={r.version} className={cn('size-2.5 rounded-full', i === all.length - 1 ? 'bg-primary' : 'bg-studio-ink/20')} />
          ))}
        </span>
      )
    default:
      return null
  }
}

function statOf(tab: GenerateTab, project: StudioProject): string {
  const bp = project.blueprint!
  const resources = Object.values(bp.resources).flat()
  const people = bp.workflow.nodes.filter((n) => n.actor === 'human').length
  switch (tab) {
    case 'requirements':
      return `${bp.requirements.capabilities.length} capabilities · ${bp.requirements.users.length} user ${bp.requirements.users.length === 1 ? 'group' : 'groups'}`
    case 'solution':
      return bp.solutionArchitecture.name
    case 'workflow':
      return `${bp.workflow.nodes.length} steps · people on ${people}`
    case 'resources':
      return `${resources.length} pinned`
    case 'data':
      return `${bp.dataModel.entities[0]?.fields.length ?? 0} fields`
    case 'experience':
      return `${bp.experience.pages.length} screens`
    case 'security':
      return `${bp.security.roles.length} roles · ${bp.security.approvals.length} ${bp.security.approvals.length === 1 ? 'approval' : 'approvals'}`
    case 'deployment':
      return project.publication ? `Live v${project.publication.version}` : `${bp.deployment.folder[0].toUpperCase()}${bp.deployment.folder.slice(1)} folder`
    case 'history':
      return `${project.revisions.length} ${project.revisions.length === 1 ? 'version' : 'versions'} · v${bp.version}`
    default:
      return ''
  }
}

const wideTiles: GenerateTab[] = ['workflow', 'experience', 'history']

function Overview({ project, onOpen }: { project: StudioProject; onOpen: (t: GenerateTab) => void }) {
  const tiles = nav.filter((n) => !['overview', 'json'].includes(n.id))
  return (
    <ul className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-4" aria-label="Blueprint sections">
      {tiles.map((n, i) => {
        const status = statusOf(n.id, project)
        const showStatus = Boolean(status)
        return (
          <motion.li key={n.id} className={cn(wideTiles.includes(n.id) && 'col-span-2')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.025 }}>
            <button
              type="button"
              onClick={() => onOpen(n.id)}
              className="studio-card flex h-full min-h-[8.5rem] w-full flex-col justify-between gap-3 rounded-[22px] p-3.5 text-left outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-center justify-between gap-2">
                <IconTile icon={n.icon} size="sm" />
                {showStatus && status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
              </span>
              <SectionGlyph tab={n.id} project={project} />
              <span>
                <span className="block text-[13px] leading-tight font-semibold">{n.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{statOf(n.id, project)}</span>
              </span>
            </button>
          </motion.li>
        )
      })}
    </ul>
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
  const human = bp.workflow.nodes.filter((n) => n.actor === 'human')
  const [showAll, setShowAll] = useState(false)
  return (
    <div className="space-y-4">
      <SectionHeader tab="workflow" project={project} />
      <ApproachFlow label="Application workflow" steps={bp.workflow.nodes.map((n) => ({ id: n.id, name: n.name, actor: n.actor, capabilityId: n.capabilityId, role: n.role }))} roleLabel={(id) => roleName(bp, id) ?? id} />
      {human.length > 0 && (
        <ul aria-label="Human decisions" className="grid gap-2.5 @3xl:grid-cols-2">
          {human.map((n) => (
            <li key={n.id} className="studio-card flex flex-wrap items-center gap-2.5 rounded-[20px] p-3">
              <IconTile icon={actorMeta.human.icon} size="sm" tone="person" />
              <p className="min-w-0 flex-1 text-[13px] font-semibold">{n.name}</p>
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
            </li>
          ))}
        </ul>
      )}
      <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        Data each step uses
        <ChevronDown aria-hidden className={cn('size-4 transition-transform', showAll && 'rotate-180')} />
      </button>
      {showAll && <ol className="grid gap-2 @4xl:grid-cols-2">
        {bp.workflow.nodes.map((n, i) => {
          const res = resources.find((r) => r.id === n.resourceId)
          return (
            <li key={n.id} className="studio-card rounded-[20px] px-4 py-3">
              <p className="text-[13px] font-medium">
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}</span>
                {n.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{res ? `${res.name} ${res.version}` : 'No resource'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Uses {n.inputs.length ? n.inputs.map(label).join(', ') : 'nothing'} · produces {n.outputs.length ? n.outputs.map(label).join(', ') : 'nothing'}
              </p>
            </li>
          )
        })}
      </ol>}
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
            <ul className="divide-y studio-card rounded-[20px]">
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
          <table className="w-full studio-card rounded-[20px] text-sm">
            <caption className="sr-only">{entity.name} fields</caption>
            <thead className="bg-white/40 text-left text-xs text-muted-foreground">
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
          <li key={p.id} className="studio-card rounded-[20px] px-3 py-2 text-sm">
            <p className="font-medium">{p.title}</p>
            <p className="text-muted-foreground">{p.purpose}</p>
            <p className="mt-1 text-xs text-muted-foreground">For {p.roles.map((r) => roleName(bp, r) ?? r).join(', ')}</p>
          </li>
        ))}
      </ul>
      <Block title="Preview">
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
        <ul className="divide-y studio-card rounded-[20px]">
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
        <ul className="divide-y studio-card rounded-[20px]">
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

function Deployment({ project }: { project: StudioProject }) {
  const bp = project.blueprint!
  return (
    <div className="space-y-5">
      <SectionHeader tab="deployment" project={project} />
      <dl className="grid gap-x-6 gap-y-3 studio-card rounded-[20px] p-4 text-sm @3xl:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Destination</dt>
          <dd>TCS BiOS desktop · {bp.deployment.folder} folder</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Runtime</dt>
          <dd>TCS BiOS runtime</dd>
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
    return <StagePrerequisite stage="generate" requires="compose" message="Connect the resources the approach needs first." />
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
                toast.success(`Restored v${version} as a new draft version`, { description: 'Publish again to make it live.' })
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
        <Button className={ctaClass} onClick={() => dispatch({ type: 'generate/confirm' })}>
          Continue to publish
          <ArrowRight />
        </Button>
      }
    >
      <nav aria-label="Blueprint sections" className="mb-4 flex flex-wrap gap-1">
        {nav.map((n) => {
          const Icon = n.icon
          return (
            <button
              key={n.id}
              type="button"
              aria-current={tab === n.id ? 'page' : undefined}
              aria-label={n.label}
              title={n.label}
              onClick={() => onTabChange(n.id)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                tab === n.id ? 'bg-studio-ink text-white' : 'bg-white/55 text-muted-foreground hover:bg-white hover:text-foreground',
              )}
            >
              <Icon aria-hidden className="size-3.5" />
              {tab === n.id && n.label}
            </button>
          )
        })}
      </nav>
      <div className="min-w-0">{content()}</div>
    </StageFrame>
  )
}
