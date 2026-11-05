import { useState, type ReactNode } from 'react'
import { ArrowRight, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ApplicationBlueprint, DataField, FieldType, ResourceRef } from '@/app/blueprint/types'
import { ExperienceRenderer } from '@/app/experience/ExperienceRenderer'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getScenario } from '@/data/studio-scenarios.mock'
import { FlowDiagram } from '../components/FlowDiagram'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { useStudio } from '../use-studio'

export type GenerateTab = 'overview' | 'workflow' | 'resources' | 'data' | 'experience' | 'security' | 'json'

const tabs: { id: GenerateTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'resources', label: 'Resources' },
  { id: 'data', label: 'Data model' },
  { id: 'experience', label: 'Experience preview' },
  { id: 'security', label: 'Security' },
  { id: 'json', label: 'JSON' },
]

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Section({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const roleName = (bp: ApplicationBlueprint, id: string | null) => (id ? (bp.security.roles.find((r) => r.id === id)?.name ?? id) : null)

function Overview({ bp }: { bp: ApplicationBlueprint }) {
  const { project } = useStudio()
  const approvals = bp.security.approvals
  const resources = Object.values(bp.resources).flat()
  return (
    <div className="space-y-8">
      <Section title="What is being created">
        <dl className="grid gap-x-6 gap-y-3 rounded-lg border bg-card p-4 text-sm @3xl:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Application</dt>
            <dd className="font-medium">{bp.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Domain</dt>
            <dd className="capitalize">{bp.domain}</dd>
          </div>
          <div className="@3xl:col-span-2">
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd>{bp.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Approach</dt>
            <dd>{bp.solutionArchitecture.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Contents</dt>
            <dd>
              {bp.workflow.nodes.length} steps · {bp.experience.pages.length} screens · {resources.length} resources · {bp.security.roles.length} roles
            </dd>
          </div>
        </dl>
      </Section>
      <Section title="How it works">
        <FlowDiagram label="Application workflow" steps={bp.workflow.nodes.map((n) => ({ id: n.id, name: n.name, actor: n.actor, capabilityId: n.capabilityId, role: n.role }))} roleLabel={(id) => roleName(bp, id) ?? id} />
      </Section>
      <Section title="Approvals required">
        <ul className="divide-y rounded-lg border bg-card">
          {approvals.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{a.description}</span>
              {a.role ? <StatusBadge tone="neutral">{roleName(bp, a.role)}</StatusBadge> : <StatusBadge tone="danger">No approver assigned</StatusBadge>}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Revision history">
        <ol className="divide-y rounded-lg border bg-card">
          {(project?.revisions ?? []).map((r, i) => (
            <li key={`${r.version}-${i}`} className="flex gap-3 px-3 py-2 text-sm">
              <span className="w-14 shrink-0 font-medium tabular-nums">{r.version}</span>
              <span className="flex-1">{r.summary}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{dateFormat.format(new Date(r.createdAt))}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}

function Workflow({ bp }: { bp: ApplicationBlueprint }) {
  const { dispatch } = useStudio()
  const resourceName = (id: string | null) => (id ? Object.values(bp.resources).flat().find((r) => r.id === id) : undefined)
  return (
    <ol className="space-y-2">
      {bp.workflow.nodes.map((n, i) => {
        const res = resourceName(n.resourceId)
        return (
          <li key={n.id} className="rounded-lg border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.name}</p>
                <p className="text-xs text-muted-foreground">
                  {n.actor === 'human' ? 'Human decision' : n.actor === 'system' ? 'Rules / system' : 'Automated'} · {res ? `${res.name} ${res.version}` : 'No resource'}
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
                    onChange={(e) => e.target.value && dispatch({ type: 'generate/patch', patch: { kind: 'assign-role', nodeId: n.id, role: e.target.value }, now: new Date().toISOString() })}
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
              Reads {n.inputs.length ? n.inputs.join(', ') : 'nothing'} · writes {n.outputs.length ? n.outputs.join(', ') : 'nothing'}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Resources({ bp }: { bp: ApplicationBlueprint }) {
  const groups: [string, ResourceRef[]][] = [
    ['Agents', bp.resources.agents],
    ['AI Workers', bp.resources.workers],
    ['Connectors', bp.resources.connectors],
    ['OS services', bp.resources.services],
    ['Domain knowledge', bp.resources.knowledge],
  ]
  return (
    <div className="space-y-6">
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <Section key={title} title={title}>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">pinned {r.version}</span>
                  <span className="text-xs text-muted-foreground">· {r.owner}</span>
                  <span className="ml-auto">
                    {r.origin === 'created' ? <StatusBadge tone="info">Created for this app</StatusBadge> : <StatusBadge tone="neutral">Existing</StatusBadge>}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ))}
    </div>
  )
}

const fieldTypes: { id: FieldType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'longtext', label: 'Long text' },
  { id: 'money', label: 'Amount' },
  { id: 'date', label: 'Date' },
]

function DataModel({ bp }: { bp: ApplicationBlueprint }) {
  const { dispatch } = useStudio()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  return (
    <div className="space-y-4">
      {bp.dataModel.entities.map((entity) => (
        <Section key={entity.id} title={entity.name} description={`The record every step and screen reads and writes.`}>
          <table className="w-full rounded-lg border bg-card text-sm">
            <thead className="bg-chrome text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Id</th>
                <th className="px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {entity.fields.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{f.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.id}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
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
              const id = clean.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('')
              const field: DataField = { id, label: clean, type }
              dispatch({ type: 'generate/patch', patch: { kind: 'add-field', entityId: entity.id, field }, now: new Date().toISOString() })
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
        </Section>
      ))}
    </div>
  )
}

function Security({ bp }: { bp: ApplicationBlueprint }) {
  return (
    <div className="space-y-6">
      <Section title="Roles">
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
      </Section>
      <Section title="Audit">
        <p className="text-sm">
          Decision log: {bp.security.audit.decisionLog ? 'enabled for every human decision' : 'not required by the specification'} · Document retention: {bp.security.audit.retention}
        </p>
      </Section>
    </div>
  )
}

function Json({ bp }: { bp: ApplicationBlueprint }) {
  const json = JSON.stringify(bp, null, 2)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">Schema {bp.schemaVersion} · for developers and advanced review. Edits happen in the other tabs.</p>
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
      </div>
      <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed">{json}</pre>
    </div>
  )
}

export function GenerateStage({ tab, onTabChange }: { tab: GenerateTab; onTabChange: (t: GenerateTab) => void }) {
  const { project, dispatch } = useStudio()
  if (!project?.blueprint) {
    return <StagePrerequisite stage="generate" requires="compose" message="Resolve the resources the approach needs first. The blueprint is compiled from them." />
  }
  const bp = project.blueprint
  const scenario = getScenario(project.scenarioId)

  return (
    <StageFrame
      stage="generate"
      aside={
        <div className="flex items-center gap-2">
          <StatusBadge tone={bp.status === 'published' ? 'success' : bp.status === 'validated' ? 'success' : 'neutral'}>
            {bp.status === 'draft' ? 'Draft' : bp.status === 'validated' ? 'Validated' : 'Published'}
          </StatusBadge>
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
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as GenerateTab)}>
        <TabsList className="mb-4 flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <Overview bp={bp} />
        </TabsContent>
        <TabsContent value="workflow">
          <Workflow bp={bp} />
        </TabsContent>
        <TabsContent value="resources">
          <Resources bp={bp} />
        </TabsContent>
        <TabsContent value="data">
          <DataModel bp={bp} />
        </TabsContent>
        <TabsContent value="experience">
          <p className="mb-3 text-sm text-muted-foreground">
            Built from blueprint pages with the trusted component catalogue — the same renderer the published application uses. Sample records are mock data.
          </p>
          <div className="h-[34rem] overflow-hidden rounded-xl border bg-card shadow-widget">
            <ExperienceRenderer key={bp.version} blueprint={bp} initialRecords={scenario?.sampleRecords ?? []} />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <Security bp={bp} />
        </TabsContent>
        <TabsContent value="json">
          <Json bp={bp} />
        </TabsContent>
      </Tabs>
    </StageFrame>
  )
}
