import { useState } from 'react'
import { useOs } from '@/app/os/use-os'
import type { AppId } from '@/app/registry/types'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appSummary, resourceActivity } from '../observability'
import { getRuntimeApp } from '../runtime-apps'
import { useRuntime } from '../store'
import { EventStream } from './EventStream'
import { ExecutionList } from './ExecutionList'
import { GovernanceView } from './GovernanceView'
import { approvalStatusMeta, executionStatusMeta, formatDateTime, useRuntimeLinks } from './meta'
import { ResourceList } from './ResourcePanel'

export type AppOpsTab = 'overview' | 'executions' | 'resources' | 'governance' | 'activity' | 'outcomes'

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Operational detail for one application: what it is doing, for whom, under which rules, with what result. */
export function ApplicationOperations({ appId, appName, initialTab = 'overview' }: { appId: string; appName: (id: string) => string; initialTab?: AppOpsTab }) {
  const state = useRuntime()
  const links = useRuntimeLinks()
  const { openApp } = useOs()
  const [tab, setTab] = useState<AppOpsTab>(initialTab)
  const app = getRuntimeApp(appId, state)
  if (!app) return <p className="text-sm text-muted-foreground">This application has no runtime records. Only published applications with a blueprint run transactions.</p>

  const execs = state.executions.filter((e) => e.appId === appId)
  const active = execs.filter((e) => e.status === 'running' || e.status === 'queued' || e.status === 'paused')
  const approvals = state.approvals.filter((a) => a.appId === appId)
  const pending = approvals.filter((a) => a.status === 'pending' || a.status === 'info-requested')
  const failed = execs.filter((e) => e.status === 'failed')
  const summary = appSummary(state, appId)
  const outcomes = state.outcomes.filter((o) => o.appId === appId).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const draft = state.builtin[appId]?.draft
  const resources = resourceActivity(state, [app])

  return (
    <div className="@container space-y-4">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{app.name}</h3>
          <p className="text-sm text-muted-foreground">
            {app.domain} · running blueprint v{app.version} · {app.source === 'builtin' ? 'built-in application' : 'published from Application Studio'}
          </p>
        </div>
        <StatusBadge tone="success">Published</StatusBadge>
        {draft && <StatusBadge tone="warning">Changes pending · draft v{draft.blueprint.version}</StatusBadge>}
        <Button size="sm" variant="outline" onClick={() => openApp(appId as AppId)}>
          Open application
        </Button>
      </header>
      <Tabs value={tab} onValueChange={(v) => setTab(v as AppOpsTab)}>
        <TabsList className="h-auto! max-w-full flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="executions">Executions · {execs.length}</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-3 @2xl:grid-cols-6">
            <Count label="Executions" value={summary.total} />
            <Count label="In progress" value={summary.inProgress} />
            <Count label="Waiting for approval" value={summary.waiting} />
            <Count label="Completed" value={summary.completed} />
            <Count label="Failed" value={summary.failed} />
            <Count label="Human decisions" value={summary.humanDecisions} />
          </dl>
          <div className="grid gap-4 @3xl:grid-cols-2">
            <section aria-label="Current activity" className="space-y-1">
              <h4 className="text-sm font-semibold">Current activity</h4>
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing is running.</p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {active.map((e) => (
                    <li key={e.id}>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => links.openExecution(e.id)}>
                        <span className="min-w-0 flex-1">
                          {e.transaction.id} · {e.steps[e.current]?.name}
                        </span>
                        <StatusBadge tone={executionStatusMeta[e.status].tone} pulse={e.status === 'running'}>
                          {executionStatusMeta[e.status].label}
                        </StatusBadge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Pending approvals" className="space-y-1">
              <h4 className="text-sm font-semibold">Pending approvals</h4>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions waiting.</p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {pending.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => links.openApproval(a.id)}>
                        <span className="min-w-0 flex-1">
                          {a.type} · {a.transactionId}
                        </span>
                        <StatusBadge tone={approvalStatusMeta[a.status].tone}>{approvalStatusMeta[a.status].label}</StatusBadge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Recent exceptions" className="space-y-1 @3xl:col-span-2">
              <h4 className="text-sm font-semibold">Recent exceptions</h4>
              {failed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No failed executions.</p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {failed.map((e) => {
                    const step = e.steps[e.current]
                    return (
                      <li key={e.id}>
                        <button type="button" className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => links.openExecution(e.id)}>
                          <span className="min-w-0 flex-1">
                            {e.transaction.id} failed at “{step?.name}”
                            <span className="block text-xs text-muted-foreground">
                              {step?.error?.what} · {step?.error?.retryable ? 'retry available' : 'no retry'} · {formatDateTime(e.endedAt)}
                            </span>
                          </span>
                          <StatusBadge tone="danger">Failed</StatusBadge>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionList executions={execs} state={state} onOpen={links.openExecution} label={`${app.name} executions`} />
        </TabsContent>
        <TabsContent value="resources">
          <ResourceList resources={resources} appName={appName} onOpen={links.openResource} />
        </TabsContent>
        <TabsContent value="governance" className="space-y-4">
          <GovernanceView app={app} />
          <section aria-label="Approval history" className="space-y-1">
            <h4 className="text-sm font-semibold">Approval history</h4>
            {approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approvals yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {[...approvals].reverse().map((a) => (
                  <li key={a.id}>
                    <button type="button" className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => links.openApproval(a.id)}>
                      <span className="min-w-0 flex-1">
                        {a.type} · {a.transactionId}
                        <span className="block text-xs text-muted-foreground">
                          {a.ruleIds.join(', ')} · {formatDateTime(a.submittedAt)}
                        </span>
                      </span>
                      <StatusBadge tone={approvalStatusMeta[a.status].tone}>{approvalStatusMeta[a.status].label}</StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-1">
            <h4 className="text-sm font-semibold">Audit records</h4>
            <EventStream state={state} mode="audit" appId={appId} appName={appName} />
          </section>
        </TabsContent>
        <TabsContent value="activity">
          <EventStream state={state} mode="activity" appId={appId} appName={appName} />
        </TabsContent>
        <TabsContent value="outcomes" className="space-y-4">
          <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-3 @2xl:grid-cols-5">
            <Count label="Completed transactions" value={summary.completed} />
            <Count label="Pending transactions" value={summary.inProgress + summary.waiting} />
            <Count label="Failed transactions" value={summary.failed} />
            <Count label="Cancelled" value={summary.cancelled} />
            <Count label="Human interventions" value={summary.humanDecisions} />
          </dl>
          {outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed transactions yet, so there are no business outcomes to report.</p>
          ) : (
            <>
              <section aria-label="Business decisions" className="space-y-1">
                <h4 className="text-sm font-semibold">Business decisions</h4>
                <ul className="flex flex-wrap gap-2">
                  {summary.outcomes.map((o) => (
                    <li key={o.label} className="rounded-lg border bg-card px-3 py-1.5 text-sm">
                      {o.label} <span className="font-semibold tabular-nums">{o.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <ul aria-label="Outcomes" className="divide-y rounded-lg border bg-card">
                {outcomes.map((o) => {
                  const e = state.executions.find((x) => x.id === o.executionId)
                  return (
                    <li key={o.id}>
                      <button type="button" className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => links.openExecution(o.executionId)}>
                        <span className="min-w-0 flex-1">
                          {o.label} · {e?.transaction.id}
                          <span className="block text-xs text-muted-foreground">
                            {o.humanIntervention ? 'Human decision' : 'Decided by rules'} · {formatDateTime(o.completedAt)}
                          </span>
                        </span>
                        <StatusBadge tone={o.tone}>{o.tone === 'success' ? 'Completed' : 'Declined'}</StatusBadge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <p className="text-xs text-muted-foreground">Counts of simulated records only — no rates, savings or accuracy figures are inferred.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
