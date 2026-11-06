import { useMemo, useState, type ReactNode } from 'react'
import { Activity, AlertTriangle, ClipboardCheck, Cpu, FileClock, Hand, LayoutDashboard, ListChecks, Loader2, RotateCcw, Server, type LucideIcon } from 'lucide-react'
import { findApp } from '@/app/registry/applicationRegistry'
import type { AppProps } from '@/app/registry/types'
import { ApplicationOperations, type AppOpsTab } from '@/app/runtime/components/ApplicationOperations'
import { ApprovalDetail } from '@/app/runtime/components/ApprovalDetail'
import { ApprovalQueue } from '@/app/runtime/components/ApprovalQueue'
import { AuditList } from '@/app/runtime/components/AuditList'
import { EventStream } from '@/app/runtime/components/EventStream'
import { ExecutionDetail } from '@/app/runtime/components/ExecutionDetail'
import { ExecutionList } from '@/app/runtime/components/ExecutionList'
import { executionStatusMeta, formatDateTime, RuntimeLinksContext, type RuntimeLinks } from '@/app/runtime/components/meta'
import { ResourceDetailPanel, ResourceList } from '@/app/runtime/components/ResourcePanel'
import { isTerminal } from '@/app/runtime/engine'
import { appSummary, resourceActivity } from '@/app/runtime/observability'
import { listRuntimeApps } from '@/app/runtime/runtime-apps'
import { resetRuntime, useRuntime } from '@/app/runtime/store'
import type { ExecutionStatus, RuntimeState } from '@/app/runtime/types'
import { useApplications } from '@/app/registry/use-applications'
import { useParamsChange } from '@/app/windows/use-params-change'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge } from '@/components/os/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type Section = 'overview' | 'applications' | 'executions' | 'approvals' | 'activity' | 'audit' | 'resources'

interface Nav {
  section: Section
  id: string | null
  status?: ExecutionStatus | 'all'
  tab?: AppOpsTab
}

const navFromParams = (p: Record<string, string>): Nav => {
  if (p.execution) return { section: 'executions', id: p.execution }
  if (p.approval) return { section: 'approvals', id: p.approval }
  if (p.app) return { section: 'applications', id: p.app, tab: (p.tab as AppOpsTab) || undefined }
  if (p.resource) return { section: 'resources', id: p.resource }
  return { section: (p.section as Section) || 'overview', id: null, status: (p.status as ExecutionStatus) || undefined }
}

function Row({ icon: Icon, tone, children, action }: { icon: LucideIcon; tone: string; children: ReactNode; action: () => void }) {
  return (
    <li>
      <button type="button" onClick={action} className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
        <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${tone}`} />
        <span className="min-w-0 flex-1">{children}</span>
      </button>
    </li>
  )
}

function Overview({ state, go, appName }: { state: RuntimeState; go: (n: Nav) => void; appName: (id: string) => string }) {
  const pending = state.approvals.filter((a) => a.status === 'pending' || a.status === 'info-requested')
  const failed = state.executions.filter((e) => e.status === 'failed')
  const active = state.executions.filter((e) => !isTerminal(e.status) && e.status !== 'waiting-approval')
  const recent = state.audit.slice(-8).reverse()
  const busy = resourceActivity(state).filter((r) => r.running > 0)
  const apps = listRuntimeApps(state)
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-semibold">Operations</h3>
      </div>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <section aria-label="Needs your attention" className="space-y-1">
          <h4 className="text-sm font-semibold">Needs your attention</h4>
          {pending.length + failed.length === 0 ? (
            <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">Nothing needs a decision or investigation.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {pending.map((a) => (
                <Row key={a.id} icon={Hand} tone="text-warning-ink" action={() => go({ section: 'approvals', id: a.id })}>
                  <span className="font-medium">{a.type}</span> · {a.transactionId}
                  <span className="block text-xs text-muted-foreground">
                    {appName(a.appId)} · waiting since {formatDateTime(a.submittedAt)}
                  </span>
                </Row>
              ))}
              {failed.map((e) => (
                <Row key={e.id} icon={AlertTriangle} tone="text-danger-ink" action={() => go({ section: 'executions', id: e.id })}>
                  <span className="font-medium">{e.transaction.id} failed</span> at “{e.steps[e.current]?.name}”
                  <span className="block text-xs text-muted-foreground">
                    {appName(e.appId)} · {e.steps[e.current]?.error?.retryable ? 'retry available' : 'needs a corrected submission'}
                  </span>
                </Row>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Happening now" className="space-y-1">
          <h4 className="text-sm font-semibold">Happening now</h4>
          {active.length === 0 ? (
            <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">No executions running. Submit a transaction from a published application to start one.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {active.map((e) => (
                <Row key={e.id} icon={e.status === 'running' ? Loader2 : ListChecks} tone={e.status === 'running' ? 'animate-spin text-info motion-reduce:animate-none' : 'text-muted-foreground'} action={() => go({ section: 'executions', id: e.id })}>
                  <span className="font-medium">{e.transaction.id}</span> · {e.steps[e.current]?.name}
                  <span className="block text-xs text-muted-foreground">
                    {appName(e.appId)} · {executionStatusMeta[e.status].label}
                    {e.steps[e.current]?.resource ? ` · ${e.steps[e.current]!.resource!.name}` : ''}
                  </span>
                </Row>
              ))}
            </ul>
          )}
          {busy.length > 0 && <p className="text-xs text-muted-foreground">Workers busy: {busy.map((r) => r.name).join(', ')}</p>}
        </section>
      </div>

      <section aria-label="Applications" className="space-y-1">
        <h4 className="text-sm font-semibold">Applications</h4>
        <ul className="divide-y rounded-lg border bg-card">
          {apps.map((a) => {
            const s = appSummary(state, a.appId)
            const draft = state.builtin[a.appId]?.draft
            return (
              <Row key={a.appId} icon={Activity} tone="text-muted-foreground" action={() => go({ section: 'applications', id: a.appId })}>
                <span className="font-medium">{a.name}</span> <span className="text-muted-foreground">v{a.version}</span>
                {draft && <span className="ml-2 text-xs text-warning-ink">changes pending</span>}
                <span className="block text-xs text-muted-foreground">
                  {s.total} executions · {s.inProgress} in progress · {s.waiting} waiting · {s.failed} failed · {s.completed} completed
                </span>
              </Row>
            )
          })}
        </ul>
      </section>

      <section aria-label="Recent events" className="space-y-1">
        <div className="flex items-center">
          <h4 className="text-sm font-semibold">Recent events</h4>
          <Button size="xs" variant="ghost" className="ml-auto" onClick={() => go({ section: 'activity', id: null })}>
            All activity
          </Button>
        </div>
        <AuditList events={recent} appName={appName} label="Recent events" />
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">Records are stored in this browser.</span>
        <Button size="xs" variant="outline" onClick={() => setConfirm(true)}>
          <RotateCcw /> Restart demo scenario
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart the operations demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Executions, approvals, audit events, outcomes, learning signals, proposals and built-in blueprint drafts return to the seeded history. Application Studio projects and published applications are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep records</AlertDialogCancel>
            <AlertDialogAction onClick={resetRuntime}>Restart scenario</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** OS-level Operations workspace: one place to see and investigate what published applications are doing. */
export function OperationsApp({ params }: AppProps) {
  useApplications()
  const state = useRuntime()
  const [nav, setNav] = useState<Nav>(() => navFromParams(params))
  useParamsChange(params, (p) => setNav(navFromParams(p)))

  const appName = useMemo(() => (id: string) => findApp(id)?.name ?? state.executions.find((e) => e.appId === id)?.appName ?? id, [state.executions])
  const links: RuntimeLinks = useMemo(
    () => ({
      openExecution: (id) => setNav({ section: 'executions', id }),
      openApproval: (id) => setNav({ section: 'approvals', id }),
      openApplication: (id) => setNav({ section: 'applications', id }),
      openResource: (id) => setNav({ section: 'resources', id }),
    }),
    [],
  )

  const pendingCount = state.approvals.filter((a) => a.status === 'pending' || a.status === 'info-requested').length
  const resources = resourceActivity(state)
  const apps = listRuntimeApps(state)
  const back = () => setNav({ section: nav.section, id: null })

  return (
    <RuntimeLinksContext.Provider value={links}>
      <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
        <SidebarNav<Section>
          label="Operations"
          value={nav.section}
          onChange={(section) => setNav({ section, id: null })}
          items={[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'applications', label: 'Applications', icon: Activity, meta: apps.length },
            { id: 'executions', label: 'Executions', icon: ListChecks, meta: state.executions.length },
            { id: 'approvals', label: 'Approvals', icon: ClipboardCheck, meta: pendingCount || undefined },
            { id: 'activity', label: 'Activity', icon: FileClock },
            { id: 'audit', label: 'Audit', icon: Server },
            { id: 'resources', label: 'Resources', icon: Cpu, meta: resources.length },
          ]}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 @3xl:p-6">
          {nav.section === 'overview' && <Overview state={state} go={setNav} appName={appName} />}
          {nav.section === 'applications' &&
            (nav.id ? (
              <div className="space-y-2">
                <Button size="xs" variant="ghost" className="-ml-2" onClick={back}>
                  ← All applications
                </Button>
                <ApplicationOperations key={`${nav.id}-${nav.tab ?? ''}`} appId={nav.id} appName={appName} initialTab={nav.tab} />
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Applications</h3>
                <ul aria-label="Runtime applications" className="divide-y rounded-lg border bg-card">
                  {apps.map((a) => {
                    const s = appSummary(state, a.appId)
                    return (
                      <li key={a.appId}>
                        <button type="button" onClick={() => setNav({ section: 'applications', id: a.appId })} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left hover:bg-muted/50">
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {a.name} <span className="font-normal text-muted-foreground">· v{a.version}</span>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {a.domain} · {s.total} executions · {s.waiting} waiting · {s.failed} failed
                            </span>
                          </span>
                          {state.builtin[a.appId]?.draft && <StatusBadge tone="warning">Changes pending</StatusBadge>}
                          <StatusBadge tone="success">Published</StatusBadge>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          {nav.section === 'executions' &&
            (nav.id ? (
              <ExecutionDetail key={nav.id} executionId={nav.id} onBack={back} />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Executions</h3>
                <ExecutionList executions={state.executions} state={state} onOpen={links.openExecution} showApplication initialStatus={nav.status ?? 'all'} label="All executions" />
              </div>
            ))}
          {nav.section === 'approvals' &&
            (nav.id ? (
              <ApprovalDetail key={nav.id} approvalId={nav.id} onBack={back} />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Approvals</h3>
                <ApprovalQueue approvals={state.approvals} state={state} onOpen={links.openApproval} />
              </div>
            ))}
          {nav.section === 'activity' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Activity</h3>
              <EventStream state={state} mode="activity" appName={appName} />
            </div>
          )}
          {nav.section === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Audit</h3>
              <EventStream state={state} mode="audit" appName={appName} />
            </div>
          )}
          {nav.section === 'resources' &&
            (nav.id && resources.find((r) => r.id === nav.id) ? (
              <ResourceDetailPanel resource={resources.find((r) => r.id === nav.id)!} appName={appName} onBack={back} />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Resources</h3>
                <ResourceList resources={resources} appName={appName} onOpen={links.openResource} />
              </div>
            ))}
        </main>
      </div>
    </RuntimeLinksContext.Provider>
  )
}
