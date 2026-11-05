import { useState, type ReactNode } from 'react'
import { Activity, AppWindow, Bot, Cpu, History, Library, Plug, Workflow } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
import { useParamsChange } from '@/app/windows/use-params-change'
import type { AppProps } from '@/app/registry/types'
import { AppIcon } from '@/components/os/AppIcon'
import { MockBadge } from '@/components/os/MockBadge'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  activity,
  agents,
  connectors,
  domainPacks,
  executions,
  platformServices,
  workers,
  type Execution,
} from '@/data/platform.mock'

type Section = 'overview' | 'applications' | 'domain-packs' | 'agents' | 'workers' | 'connectors' | 'workflows' | 'activity'

const sections: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'applications', label: 'Applications', icon: AppWindow },
  { id: 'domain-packs', label: 'Domain packs', icon: Library },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'workers', label: 'Workers', icon: Cpu },
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'workflows', label: 'Executions', icon: Workflow },
  { id: 'activity', label: 'Activity', icon: History },
]

const isSection = (v: string | undefined): v is Section => sections.some((s) => s.id === v)

const executionTone: Record<Execution['state'], StatusTone> = {
  running: 'info',
  'waiting-approval': 'warning',
  failed: 'danger',
  completed: 'success',
}
const executionLabel: Record<Execution['state'], string> = {
  running: 'Running',
  'waiting-approval': 'Waiting for approval',
  failed: 'Failed',
  completed: 'Completed',
}

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

function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-chrome text-left text-xs text-muted-foreground">
          <tr className="border-b">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2">{children}</tbody>
      </table>
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

function Applications() {
  const { windows, openApp } = useOs()
  const applications = useApplications()
  return (
    <>
      <SectionHeader title="Application registry" source="Every application and system workspace registered with this OS." />
      <DataTable head={['Application', 'Version', 'Lifecycle', 'Owner', 'Session', '']}>
        {applications
          .filter((a) => a.id !== 'folder-browser')
          .map((app) => {
            const open = windows.some((w) => w.appId === app.id)
            return (
              <tr key={app.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <AppIcon app={app} size="xs" />
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.id}</p>
                    </div>
                  </div>
                </td>
                <td className="tabular-nums">{app.version}</td>
                <td>
                  <StatusBadge tone={app.lifecycle === 'published' ? 'success' : app.lifecycle === 'preview' ? 'info' : 'neutral'}>
                    {app.lifecycle === 'published' ? 'Published' : app.lifecycle === 'preview' ? 'Preview' : 'System'}
                  </StatusBadge>
                </td>
                <td className="text-muted-foreground">{app.owner}</td>
                <td className="text-muted-foreground">{open ? 'Open' : '—'}</td>
                <td className="text-right">
                  <Button size="xs" variant="outline" onClick={() => openApp(app.id)}>
                    {open ? 'Switch to' : 'Open'}
                  </Button>
                </td>
              </tr>
            )
          })}
      </DataTable>
    </>
  )
}

function DomainPacks() {
  return (
    <>
      <SectionHeader title="Domain packs" source="Versioned domain intelligence (ontology, rules, processes). Built in Phase 2.">
        <MockBadge />
      </SectionHeader>
      <DataTable head={['Pack', 'Version', 'Status', 'Contents']}>
        {domainPacks.map((p) => (
          <tr key={p.id}>
            <td className="font-medium">{p.name}</td>
            <td className="tabular-nums">{p.version}</td>
            <td>
              <StatusBadge tone="neutral">Planned</StatusBadge>
            </td>
            <td className="text-muted-foreground">{p.contents}</td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function Agents() {
  return (
    <>
      <SectionHeader title="Agents" source="Read from the Agent Control Plane, which remains the source of truth. Not connected in Phase 1.">
        <MockBadge />
      </SectionHeader>
      <DataTable head={['Agent', 'Version', 'Capability', 'Certified for', 'Status']}>
        {agents.map((a) => (
          <tr key={a.id}>
            <td className="font-medium">{a.name}</td>
            <td className="tabular-nums">{a.version}</td>
            <td className="text-muted-foreground">{a.capability}</td>
            <td className="text-muted-foreground">{a.certifiedDomains.join(', ')}</td>
            <td>
              <StatusBadge tone={a.state === 'available' ? 'success' : a.state === 'restricted' ? 'warning' : 'neutral'}>
                {a.state === 'available' ? 'Available' : a.state === 'restricted' ? 'Restricted' : 'Retired'}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function Workers() {
  return (
    <>
      <SectionHeader title="Workers" source="Read from the AI Workers Platform, which owns composition and lifecycle. Not connected in Phase 1.">
        <MockBadge />
      </SectionHeader>
      <DataTable head={['Worker', 'Version', 'Capability', 'Status', 'Current task']}>
        {workers.map((w) => (
          <tr key={w.id}>
            <td className="font-medium">{w.name}</td>
            <td className="tabular-nums">{w.version}</td>
            <td className="text-muted-foreground">{w.capability}</td>
            <td>
              <StatusBadge tone={w.state === 'busy' ? 'info' : w.state === 'provisioning' ? 'warning' : 'neutral'} pulse={w.state === 'busy'}>
                {w.state === 'busy' ? 'Busy' : w.state === 'provisioning' ? 'Validating' : 'Idle'}
              </StatusBadge>
            </td>
            <td className="text-muted-foreground">{w.currentTask ?? '—'}</td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function Connectors() {
  return (
    <>
      <SectionHeader title="Connectors" source="Governed integrations with enterprise systems. Not connected in Phase 1.">
        <MockBadge />
      </SectionHeader>
      <DataTable head={['Connector', 'System', 'Protocol', 'Status']}>
        {connectors.map((c) => (
          <tr key={c.id}>
            <td className="font-medium">{c.name}</td>
            <td className="text-muted-foreground">{c.system}</td>
            <td className="text-muted-foreground">{c.protocol}</td>
            <td>
              <StatusBadge tone={c.state === 'connected' ? 'success' : 'danger'}>
                {c.state === 'connected' ? 'Connected' : 'Disconnected'}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function Executions() {
  const { openApp } = useOs()
  return (
    <>
      <SectionHeader title="Workflow executions" source="Workflow runs across published applications.">
        <MockBadge />
      </SectionHeader>
      <DataTable head={['Execution', 'Workflow', 'Subject', 'Step', 'Status', '']}>
        {executions.map((e) => (
          <tr key={e.id}>
            <td className="tabular-nums">
              <p className="font-medium">{e.id}</p>
              <p className="text-xs text-muted-foreground">Started {e.startedAt}</p>
            </td>
            <td className="text-muted-foreground">{e.workflow}</td>
            <td className="tabular-nums">{e.subject}</td>
            <td className="text-muted-foreground">
              {e.step} <span className="tabular-nums">({e.stepIndex}/{e.stepCount})</span>
            </td>
            <td>
              <StatusBadge tone={executionTone[e.state]} pulse={e.state === 'running'}>
                {executionLabel[e.state]}
              </StatusBadge>
            </td>
            <td className="text-right">
              <Button size="xs" variant="outline" onClick={() => openApp(e.appId)}>
                Open {getApp(e.appId).name}
              </Button>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function ActivityLog() {
  return (
    <>
      <SectionHeader title="Activity" source="Deployments, approvals, executions and configuration changes.">
        <MockBadge />
      </SectionHeader>
      <ol className="divide-y rounded-lg border">
        {activity.map((a) => (
          <li key={a.id} className="flex gap-4 px-3 py-2.5 text-sm">
            <span className="w-20 shrink-0 text-muted-foreground tabular-nums">{a.at}</span>
            <div className="min-w-0">
              <p>{a.summary}</p>
              <p className="text-xs text-muted-foreground">{a.actor}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

const sectionComponents: Record<Section, () => ReactNode> = {
  overview: Overview,
  applications: Applications,
  'domain-packs': DomainPacks,
  agents: Agents,
  workers: Workers,
  connectors: Connectors,
  workflows: Executions,
  activity: ActivityLog,
}

export function SystemExplorerApp({ params }: AppProps) {
  const [section, setSection] = useState<Section>(isSection(params.section) ? params.section : 'overview')

  useParamsChange(params, (p) => {
    if (isSection(p.section)) setSection(p.section)
  })

  const Content = sectionComponents[section]

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav label="System Explorer" items={sections} value={section} onChange={setSection} />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        <Content />
      </div>
    </div>
  )
}
