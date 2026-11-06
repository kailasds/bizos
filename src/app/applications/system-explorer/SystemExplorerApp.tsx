import { useState, type ReactNode } from 'react'
import { Activity, AppWindow, Bot, Cpu, History, Library, Plug, Server, Workflow } from 'lucide-react'
import type { ResourceKind } from '@/app/blueprint/types'
import { useOs } from '@/app/os/use-os'
import type { AppProps } from '@/app/registry/types'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { formatActivityTime, platformActivity } from '@/app/services/mock/activity-service'
import { searchCatalogue } from '@/app/services/mock/resource-discovery-service'
import { useStudio } from '@/app/studio/use-studio'
import { useParamsChange } from '@/app/windows/use-params-change'
import { MockBadge } from '@/components/os/MockBadge'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import type { ActivityCategory } from '@/data/activity.mock'
import { platformServices } from '@/data/platform.mock'
import { ExecutionList } from '@/app/runtime/components/ExecutionList'
import { useOperationsLinks } from '@/app/runtime/components/links'
import { RuntimeLinksContext } from '@/app/runtime/components/meta'
import { useRuntime } from '@/app/runtime/store'
import { availabilityLabel, type PlatformResource, type ResourceAvailability } from '@/data/resources.mock'
import { ApplicationDetail } from './ApplicationDetail'
import { ApplicationRegistry } from './ApplicationRegistry'

type Section = 'overview' | 'applications' | 'domain-packs' | 'agents' | 'workers' | 'connectors' | 'services' | 'workflows' | 'activity'

const sections: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'applications', label: 'Applications', icon: AppWindow },
  { id: 'workers', label: 'AI Workers', icon: Cpu },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'domain-packs', label: 'Domain knowledge', icon: Library },
  { id: 'workflows', label: 'Executions', icon: Workflow },
  { id: 'activity', label: 'Activity', icon: History },
]

const isSection = (v: string | undefined): v is Section => sections.some((s) => s.id === v)

const availabilityTone: Record<ResourceAvailability, StatusTone> = { available: 'success', restricted: 'warning', validating: 'info', planned: 'neutral' }

function SectionHeader({ title, source, children }: { title: string; source?: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {children}
      </div>
      {source && <p className="text-sm text-muted-foreground">{source}</p>}
    </div>
  )
}

function Overview() {
  return (
    <>
      <SectionHeader title="Platform health" source="Status of the runtime and the platforms this OS depends on.">
        <MockBadge />
      </SectionHeader>
      <ul className="grid gap-3 @2xl:grid-cols-2">
        {platformServices.map((s) => (
          <li key={s.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{s.name}</span>
              <StatusBadge tone={s.state === 'operational' ? 'success' : s.state === 'degraded' ? 'warning' : 'danger'}>
                {s.state === 'operational' ? 'Operational' : s.state === 'degraded' ? 'Degraded' : 'Outage'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>
            <p className="mt-2 text-xs text-muted-foreground">Owned by {s.owner}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

const resourceSections: Partial<Record<Section, { kind: ResourceKind; title: string; source: string }>> = {
  workers: { kind: 'worker', title: 'AI Workers', source: 'Read from the AI Workers Platform, which owns composition and lifecycle. Not connected in this prototype.' },
  agents: { kind: 'agent', title: 'Agents', source: 'Read from the Agent Control Plane, which remains the source of truth. Not connected in this prototype.' },
  connectors: { kind: 'connector', title: 'Connectors', source: 'Governed integrations with enterprise systems. Not connected in this prototype.' },
  services: { kind: 'service', title: 'Services', source: 'Services provided by Enterprise AI OS itself.' },
  'domain-packs': { kind: 'knowledge', title: 'Domain knowledge', source: 'Versioned domain packs from the Domain Intelligence Kernel.' },
}

function Resources({ section }: { section: Section }) {
  const meta = resourceSections[section]!
  const [detail, setDetail] = useState<PlatformResource | null>(null)
  const list = searchCatalogue({ kind: meta.kind })
  return (
    <>
      <SectionHeader title={meta.title} source={meta.source}>
        <MockBadge />
      </SectionHeader>
      <ul className="divide-y rounded-lg border bg-card">
        {list.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setDetail(r)}
              className="flex w-full flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {r.name} <span className="font-normal text-muted-foreground tabular-nums">· {r.version}</span>
                </span>
                <span className="block text-sm text-muted-foreground">{r.purpose}</span>
                {r.runtime && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Simulated: {r.runtime.state === 'busy' ? 'busy' : r.runtime.state === 'validating' ? 'in validation' : 'idle'}
                    {r.runtime.currentTask ? ` — ${r.runtime.currentTask}` : ''}
                  </span>
                )}
              </span>
              <StatusBadge tone={availabilityTone[r.availability]} pulse={r.runtime?.state === 'busy'}>
                {availabilityLabel[r.availability]}
              </StatusBadge>
            </button>
          </li>
        ))}
      </ul>
      <ResourceDetailSheet resource={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  )
}

function Executions() {
  const runtime = useRuntime()
  const links = useOperationsLinks()
  const { openApp } = useOs()
  return (
    <RuntimeLinksContext.Provider value={links}>
      <SectionHeader title="Workflow executions" source="Executions of published applications, from the shared simulated runtime. Investigate one in Operations.">
        <MockBadge label="Simulated" />
      </SectionHeader>
      <ExecutionList executions={runtime.executions} state={runtime} onOpen={links.openExecution} showApplication label="Workflow executions" />
      <Button size="sm" variant="outline" className="mt-3" onClick={() => openApp('operations', { section: 'executions' })}>
        Open Operations
      </Button>
    </RuntimeLinksContext.Provider>
  )
}

const categoryLabel: Record<ActivityCategory, string> = {
  deployment: 'Publication',
  approval: 'Approval',
  execution: 'Execution',
  resource: 'Resource',
  configuration: 'Configuration',
  validation: 'Validation',
  blueprint: 'Blueprint change',
  composition: 'Composition',
}

function ActivityLog() {
  const { state } = useStudio()
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all')
  const all = platformActivity(state.projects)
  const shown = all.filter((a) => category === 'all' || a.category === category)
  const present = [...new Set(all.map((a) => a.category))]
  return (
    <>
      <SectionHeader title="Activity" source="Publications, blueprint changes, validation runs, compositions and approvals. Seed events are simulated; Studio events are your own." />
      <div role="group" aria-label="Filter activity" className="mb-3 flex flex-wrap gap-1">
        <Button size="xs" variant={category === 'all' ? 'secondary' : 'ghost'} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          All
        </Button>
        {present.map((c) => (
          <Button key={c} size="xs" variant={category === c ? 'secondary' : 'ghost'} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {categoryLabel[c]}
          </Button>
        ))}
      </div>
      <ol className="divide-y rounded-lg border">
        {shown.map((a) => (
          <li key={a.id} className="flex gap-4 px-3 py-2.5 text-sm">
            <span className="w-28 shrink-0 text-xs leading-5 text-muted-foreground tabular-nums">{formatActivityTime(a.at)}</span>
            <div className="min-w-0 flex-1">
              <p>{a.summary}</p>
              <p className="text-xs text-muted-foreground">
                {categoryLabel[a.category]} · {a.actor}
                {a.simulated ? ' · simulated' : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

function Applications({ appId, onSelect }: { appId: string | null; onSelect: (id: string | null) => void }) {
  if (appId) return <ApplicationDetail id={appId} onBack={() => onSelect(null)} />
  return (
    <>
      <SectionHeader title="Application registry" source="Every application on this OS: built-in, published from Application Studio, and drafts still being designed." />
      <ApplicationRegistry onSelect={onSelect} />
    </>
  )
}

export function SystemExplorerApp({ params }: AppProps) {
  const [section, setSection] = useState<Section>(isSection(params.section) ? params.section : 'overview')
  const [appId, setAppId] = useState<string | null>(params.app ?? null)

  useParamsChange(params, (p) => {
    if (isSection(p.section)) setSection(p.section)
    setAppId(p.app ?? null)
  })

  const content = () => {
    if (section === 'overview') return <Overview />
    if (section === 'applications') return <Applications appId={appId} onSelect={setAppId} />
    if (section === 'workflows') return <Executions />
    if (section === 'activity') return <ActivityLog />
    return <Resources key={section} section={section} />
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav
        label="System Explorer"
        items={sections}
        value={section}
        onChange={(s) => {
          setSection(s)
          setAppId(null)
        }}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">{content()}</div>
    </div>
  )
}
