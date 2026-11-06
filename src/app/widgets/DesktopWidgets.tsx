import { Activity, AppWindow, ClipboardCheck, Cpu, History, LayoutDashboard, Workflow } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useOs } from '@/app/os/use-os'
import type { WidgetId } from '@/app/os/os-context'
import { findApp, getApp, getGeneratedApp } from '@/app/registry/applicationRegistry'
import type { AppId } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { useAllAppRecords } from '@/app/services/app-records-store'
import { formatActivityTime, platformActivity } from '@/app/services/mock/activity-service'
import { studioAttention } from '@/app/services/mock/attention-service'
import { useMockServices } from '@/app/services/use-mock-services'
import { lifecycleOf } from '@/app/studio/lifecycle'
import { useStudio } from '@/app/studio/use-studio'
import { AppIcon } from '@/components/os/AppIcon'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/data/claims.mock'
import { platformServices } from '@/data/platform.mock'
import { useRuntime } from '@/app/runtime/store'
import { platformResources } from '@/data/resources.mock'
import { scenarioForDomain } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'
import { widgetOrder } from './widgetCatalog'

const healthLabel = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' } as const
const healthTone = { operational: 'success', degraded: 'warning', outage: 'danger' } as const

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 mb-1 text-xs font-medium text-muted-foreground first:mt-0">{children}</h3>
}

const rowButton =
  'relative z-10 flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'

function PlatformHealthWidget() {
  const { openApp } = useOs()
  const issues = platformServices.filter((s) => s.state !== 'operational')
  return (
    <WidgetCard
      icon={Activity}
      title="Platform health"
      openLabel="Platform health — open System Explorer overview"
      onOpen={() => openApp('system-explorer', { section: 'overview' })}
      aside={<StatusBadge tone={issues.length ? 'warning' : 'success'}>{issues.length ? `${issues.length} degraded` : 'All operational'}</StatusBadge>}
    >
      <ul className="space-y-2">
        {platformServices.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{s.name}</span>
            <StatusBadge tone={healthTone[s.state]}>{healthLabel[s.state]}</StatusBadge>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

/** Pending human decisions in published generated applications (from their persisted mock records). */
function useGeneratedApprovals() {
  const apps = useApplications()
  const records = useAllAppRecords()
  return apps
    .filter((a) => a.generated)
    .map((a) => {
      const record = getGeneratedApp(a.id)
      if (!record) return null
      const statuses = record.blueprint.experience.pages.flatMap((p) => p.components).flatMap((c) => (c.type === 'approval-queue' ? [c.statusValue] : []))
      const list = records[a.id] ?? scenarioForDomain(record.domain).sampleRecords
      const count = list.filter((r) => statuses.includes(String(r.status))).length
      return count ? { app: a, count } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
}

function ApprovalsWidget() {
  const { openApp } = useOs()
  const { pendingApprovals } = useMockServices()
  const { state } = useStudio()
  const generated = useGeneratedApprovals()
  const runtimeApprovals = useRuntime().approvals.filter((a) => a.status === 'pending' || a.status === 'info-requested')
  const attention = studioAttention(state.projects).slice(0, 2)
  const next = [...pendingApprovals].sort((a, b) => a.slaHoursRemaining - b.slaHoursRemaining)[0]
  const total = pendingApprovals.length + generated.reduce((n, g) => n + g.count, 0) + runtimeApprovals.length

  return (
    <WidgetCard
      icon={ClipboardCheck}
      title="Approvals"
      openLabel="Approvals — open Claims Intelligence approvals"
      onOpen={() => openApp('claims-intelligence', { view: 'approvals' })}
    >
      {total === 0 && attention.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is waiting on you.</p>
      ) : (
        <>
          {total > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{total}</span>
              <span className="text-sm text-muted-foreground">decision{total === 1 ? '' : 's'} awaiting you</span>
            </div>
          )}
          {next && (
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {next.id} · {formatCurrency(next.amount)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">Claims Intelligence · due in {next.slaHoursRemaining} h</p>
              </div>
              <Button size="xs" className="relative z-10" onClick={() => openApp('claims-intelligence', { view: 'approvals', claim: next.id })}>
                Review
              </Button>
            </div>
          )}
          {runtimeApprovals.length > 0 && (
            <button type="button" className={cn(rowButton, 'mt-1')} onClick={() => openApp('operations', { section: 'approvals' })}>
              <ClipboardCheck aria-hidden className="size-4 text-warning-ink" />
              <span className="min-w-0 flex-1 truncate">Running executions</span>
              <span className="text-xs text-muted-foreground tabular-nums">{runtimeApprovals.length} awaiting</span>
            </button>
          )}
          {generated.map((g) => (
            <button key={g.app.id} type="button" className={cn(rowButton, 'mt-1')} onClick={() => openApp(g.app.id)}>
              <AppIcon app={g.app} size="xs" />
              <span className="min-w-0 flex-1 truncate">{g.app.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{g.count} awaiting</span>
            </button>
          ))}
          {attention.length > 0 && (
            <>
              <SubHeading>Needs your attention in Studio</SubHeading>
              <ul className="-mx-2">
                {attention.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={rowButton} onClick={() => openApp('application-studio', { project: a.projectId })}>
                      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', a.tone === 'danger' ? 'bg-danger' : a.tone === 'warning' ? 'bg-warning' : 'bg-info')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{a.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </WidgetCard>
  )
}

function ApplicationActivityWidget() {
  const { windows, focusedId, openApp, focusWindow, recentApps } = useOs()
  const apps = useApplications()
  const { state } = useStudio()
  const published = apps
    .filter((a) => a.generated)
    .sort((a, b) => (b.generated!.publishedAt ?? '').localeCompare(a.generated!.publishedAt ?? ''))
    .slice(0, 2)
  const pending = state.projects.filter((p) => lifecycleOf(p) === 'changes-pending').slice(0, 2)
  const recent = recentApps
    .filter((r) => !windows.some((w) => w.appId === r.appId))
    .map((r) => findApp(r.appId))
    .filter((a): a is NonNullable<typeof a> => Boolean(a) && a!.kind === 'application')
    .slice(0, 3)
  const nothing = !windows.length && !published.length && !pending.length && !recent.length

  return (
    <WidgetCard
      icon={AppWindow}
      title="Application activity"
      openLabel="Application activity — open the application registry"
      onOpen={() => openApp('system-explorer', { section: 'applications' })}
    >
      {nothing ? (
        <p className="text-sm text-muted-foreground">No applications open yet. Open one from the desktop or dock.</p>
      ) : (
        <div className="-mx-2">
          {windows.length > 0 && (
            <>
              <SubHeading>
                <span className="px-2">Open now</span>
              </SubHeading>
              <ul className="space-y-0.5">
                {windows.map((w) => {
                  const app = getApp(w.appId)
                  const status = w.status === 'minimized' ? 'Minimized' : w.id === focusedId ? 'Active' : 'Open'
                  return (
                    <li key={w.id}>
                      <button type="button" onClick={() => focusWindow(w.id)} className={rowButton}>
                        <AppIcon app={app} size="xs" />
                        <span className="min-w-0 flex-1 truncate">{app.name}</span>
                        <span className={cn('text-xs', status === 'Active' ? 'text-primary' : 'text-muted-foreground')}>{status}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {published.length > 0 && (
            <>
              <SubHeading>
                <span className="px-2">Recently published</span>
              </SubHeading>
              <ul className="space-y-0.5">
                {published.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => openApp(a.id)} className={rowButton}>
                      <AppIcon app={a} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">v{a.version}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {pending.length > 0 && (
            <>
              <SubHeading>
                <span className="px-2">Pending changes</span>
              </SubHeading>
              <ul className="space-y-0.5">
                {pending.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => openApp('application-studio', { project: p.id })} className={rowButton}>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-warning-ink tabular-nums">
                        v{p.publication?.version} → v{p.blueprint?.version}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {recent.length > 0 && (
            <>
              <SubHeading>
                <span className="px-2">Recently opened</span>
              </SubHeading>
              <ul className="space-y-0.5">
                {recent.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => openApp(a.id as AppId)} className={rowButton}>
                      <AppIcon app={a} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </WidgetCard>
  )
}

function ActiveExecutionsWidget() {
  const { openApp } = useOs()
  const runtime = useRuntime()
  const active = runtime.executions.filter((e) => e.status === 'running' || e.status === 'queued' || e.status === 'paused' || e.status === 'waiting-approval')
  const failed = runtime.executions.filter((e) => e.status === 'failed').length
  return (
    <WidgetCard
      icon={Workflow}
      title="Simulated executions"
      openLabel="Simulated executions — open Operations executions"
      onOpen={() => openApp('operations', { section: 'executions' })}
      aside={failed > 0 ? <StatusBadge tone="danger">{failed} failed</StatusBadge> : undefined}
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing running. Submit a transaction from a published application.</p>
      ) : (
        <ul className="space-y-3">
          {active.slice(0, 3).map((e) => {
            const done = e.steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length
            return (
              <li key={e.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{e.transaction.id}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {done}/{e.steps.length}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {e.status === 'waiting-approval' ? 'Waiting for approval' : e.status === 'paused' ? 'Paused' : e.steps[e.current]?.name} · {e.appName}
                </p>
                <Progress value={(done / e.steps.length) * 100} className="mt-1.5" aria-label={`${e.transaction.id} progress`} />
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

function WorkerActivityWidget() {
  const { openApp } = useOs()
  const { state } = useStudio()
  const workers = platformResources.filter((r) => r.kind === 'worker')
  const busy = workers.filter((w) => w.runtime?.state === 'busy')
  const validating = workers.filter((w) => w.runtime?.state === 'validating').length
  const failed = useRuntime().executions.filter((e) => e.status === 'failed').length
  const composed = state.projects.flatMap((p) => (p.composition?.createdWorkers ?? []).map((w) => ({ project: p.name, worker: w.resource })))

  return (
    <WidgetCard
      icon={Cpu}
      title="Worker activity"
      openLabel="Worker activity — open System Explorer workers"
      onOpen={() => openApp('system-explorer', { section: 'workers' })}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{busy.length}</span>
        <span className="text-sm text-muted-foreground">
          of {workers.length} workers busy{validating ? ` · ${validating} in validation` : ''}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {workers.map((w) => (
          <span
            key={w.id}
            className={cn('h-1.5 flex-1 rounded-full', w.runtime?.state === 'busy' ? 'bg-primary' : w.runtime?.state === 'validating' ? 'bg-warning' : 'bg-muted')}
          />
        ))}
      </div>
      <SubHeading>In application workflows</SubHeading>
      <ul className="space-y-1">
        {busy.slice(0, 3).map((w) => (
          <li key={w.id} className="text-xs text-muted-foreground">
            <span className="text-foreground">{w.name}</span> — {w.runtime?.currentTask}
            {w.runtime?.appId && ` · ${getApp(w.runtime.appId).name}`}
          </li>
        ))}
      </ul>
      {(composed.length > 0 || failed > 0) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {composed.length > 0 && `Composed for your apps: ${composed.map((c) => c.worker.name).join(', ')}. `}
          {failed > 0 && `${failed} execution${failed === 1 ? '' : 's'} failed — see Operations.`}
        </p>
      )}
    </WidgetCard>
  )
}

function PlatformActivityWidget() {
  const { openApp } = useOs()
  const { state } = useStudio()
  const events = platformActivity(state.projects).slice(0, 4)
  return (
    <WidgetCard
      icon={History}
      title="Platform activity"
      openLabel="Platform activity — open System Explorer activity"
      onOpen={() => openApp('system-explorer', { section: 'activity' })}
    >
      <ol className="space-y-2.5">
        {events.map((a) => (
          <li key={a.id} className="flex gap-3 text-sm">
            <span className="w-16 shrink-0 text-xs leading-5 text-muted-foreground tabular-nums">{formatActivityTime(a.at).replace(/^\d+ \w+, /, '')}</span>
            <span className="min-w-0">
              <span className="line-clamp-2">{a.summary}</span>
              {!a.simulated && <span className="text-xs text-primary">You</span>}
            </span>
          </li>
        ))}
      </ol>
    </WidgetCard>
  )
}

const widgetComponents: Record<WidgetId, ComponentType> = {
  'platform-health': PlatformHealthWidget,
  'pending-approvals': ApprovalsWidget,
  'active-applications': ApplicationActivityWidget,
  'active-executions': ActiveExecutionsWidget,
  'worker-activity': WorkerActivityWidget,
  'recent-activity': PlatformActivityWidget,
}

export function DesktopWidgets() {
  const { widgetPreferences, openApp } = useOs()
  const visible = widgetOrder.filter((w) => widgetPreferences[w.id])

  return (
    <aside aria-label="System overview" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold whitespace-nowrap">System overview</h2>
        <MockBadge />
        <Button size="xs" variant="ghost" className="ml-auto text-foreground/80 hover:bg-white/45" onClick={() => openApp('settings', { section: 'desktop' })}>
          <LayoutDashboard />
          Customize
        </Button>
      </div>
      {visible.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card/60">
          <EmptyHeader>
            <EmptyTitle>All widgets are hidden</EmptyTitle>
            <EmptyDescription>Choose which widgets appear on the desktop in Settings.</EmptyDescription>
          </EmptyHeader>
          <Button size="sm" variant="outline" onClick={() => openApp('settings', { section: 'desktop' })}>
            Choose widgets
          </Button>
        </Empty>
      ) : (
        visible.map(({ id }) => {
          const Widget = widgetComponents[id]
          return <Widget key={id} />
        })
      )}
    </aside>
  )
}
