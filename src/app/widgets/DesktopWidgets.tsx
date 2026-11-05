import { Activity, AppWindow, ClipboardCheck, Cpu, History, LayoutDashboard, Workflow } from 'lucide-react'
import type { ComponentType } from 'react'
import { useOs } from '@/app/os/use-os'
import type { WidgetId } from '@/app/os/os-context'
import { getApp } from '@/app/registry/applicationRegistry'
import { useMockServices } from '@/app/services/use-mock-services'
import { AppIcon } from '@/components/os/AppIcon'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/data/claims.mock'
import { activity, executions, platformServices, workers } from '@/data/platform.mock'
import { cn } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'
import { widgetOrder } from './widgetCatalog'

const healthLabel = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' } as const
const healthTone = { operational: 'success', degraded: 'warning', outage: 'danger' } as const

function PlatformHealthWidget() {
  const { openApp } = useOs()
  const issues = platformServices.filter((s) => s.state !== 'operational')
  return (
    <WidgetCard
      icon={Activity}
      title="Platform health"
      openLabel="Platform health — open System Explorer overview"
      onOpen={() => openApp('system-explorer', { section: 'overview' })}
      aside={
        <StatusBadge tone={issues.length ? 'warning' : 'success'}>
          {issues.length ? `${issues.length} degraded` : 'All operational'}
        </StatusBadge>
      }
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

function PendingApprovalsWidget() {
  const { openApp } = useOs()
  const { pendingApprovals } = useMockServices()
  const next = [...pendingApprovals].sort((a, b) => a.slaHoursRemaining - b.slaHoursRemaining)[0]
  return (
    <WidgetCard
      icon={ClipboardCheck}
      title="Pending approvals"
      openLabel="Pending approvals — open Claims Intelligence approvals"
      onOpen={() => openApp('claims-intelligence', { view: 'approvals' })}
    >
      {next ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{pendingApprovals.length}</span>
            <span className="text-sm text-muted-foreground">awaiting your decision</span>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {next.id} · {formatCurrency(next.amount)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">Due in {next.slaHoursRemaining} h</p>
            </div>
            <Button
              size="xs"
              className="relative z-10"
              onClick={() => openApp('claims-intelligence', { view: 'approvals', claim: next.id })}
            >
              Review
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing is waiting on you.</p>
      )}
    </WidgetCard>
  )
}

function ActiveApplicationsWidget() {
  const { windows, focusedId, openApp, focusWindow } = useOs()
  return (
    <WidgetCard
      icon={AppWindow}
      title="Active applications"
      openLabel="Active applications — open System Explorer applications"
      onOpen={() => openApp('system-explorer', { section: 'applications' })}
      aside={<span className="text-xs text-muted-foreground">This session</span>}
    >
      {windows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications open. Open one from the desktop or dock.</p>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {windows.map((w) => {
            const app = getApp(w.appId)
            const state = w.status === 'minimized' ? 'Minimized' : w.id === focusedId ? 'Active' : 'Open'
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => focusWindow(w.id)}
                  className="relative z-10 flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <AppIcon app={app} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{app.name}</span>
                  <span className={cn('text-xs', state === 'Active' ? 'text-primary' : 'text-muted-foreground')}>
                    {state}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

function ActiveExecutionsWidget() {
  const { openApp } = useOs()
  const running = executions.filter((e) => e.state === 'running')
  const failed = executions.filter((e) => e.state === 'failed').length
  return (
    <WidgetCard
      icon={Workflow}
      title="Active executions"
      openLabel="Active executions — open System Explorer workflows"
      onOpen={() => openApp('system-explorer', { section: 'workflows' })}
      aside={failed > 0 ? <StatusBadge tone="danger">{failed} failed</StatusBadge> : undefined}
    >
      <ul className="space-y-3">
        {running.map((e) => (
          <li key={e.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{e.subject}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {e.stepIndex}/{e.stepCount}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{e.step}</p>
            <Progress value={(e.stepIndex / e.stepCount) * 100} className="mt-1.5" aria-label={`${e.subject} progress`} />
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

function WorkerActivityWidget() {
  const { openApp } = useOs()
  const busy = workers.filter((w) => w.state === 'busy')
  return (
    <WidgetCard
      icon={Cpu}
      title="Worker activity"
      openLabel="Worker activity — open System Explorer workers"
      onOpen={() => openApp('system-explorer', { section: 'workers' })}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{busy.length}</span>
        <span className="text-sm text-muted-foreground">of {workers.length} workers busy</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {workers.map((w) => (
          <span
            key={w.id}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              w.state === 'busy' ? 'bg-primary' : w.state === 'provisioning' ? 'bg-warning' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {busy.slice(0, 2).map((w) => (
          <li key={w.id} className="truncate text-xs text-muted-foreground">
            <span className="text-foreground">{w.name}</span> — {w.currentTask}
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

function RecentActivityWidget() {
  const { openApp } = useOs()
  return (
    <WidgetCard
      icon={History}
      title="Recent activity"
      openLabel="Recent activity — open System Explorer activity"
      onOpen={() => openApp('system-explorer', { section: 'activity' })}
    >
      <ol className="space-y-2.5">
        {activity.slice(0, 3).map((a) => (
          <li key={a.id} className="flex gap-3 text-sm">
            <span className="w-14 shrink-0 text-xs leading-5 text-muted-foreground tabular-nums">{a.at}</span>
            <span className="line-clamp-2 min-w-0">{a.summary}</span>
          </li>
        ))}
      </ol>
    </WidgetCard>
  )
}

const widgetComponents: Record<WidgetId, ComponentType> = {
  'platform-health': PlatformHealthWidget,
  'pending-approvals': PendingApprovalsWidget,
  'active-applications': ActiveApplicationsWidget,
  'active-executions': ActiveExecutionsWidget,
  'worker-activity': WorkerActivityWidget,
  'recent-activity': RecentActivityWidget,
}


export function DesktopWidgets() {
  const { widgetPreferences, openApp } = useOs()
  const visible = widgetOrder.filter((w) => widgetPreferences[w.id])

  return (
    <aside aria-label="System overview" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium whitespace-nowrap">System overview</h2>
        <MockBadge />
        <Button
          size="xs"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={() => openApp('settings', { section: 'desktop' })}
        >
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
