import { useState } from 'react'
import { ArrowLeft, Ban, Hand, Pause, Play, RotateCcw } from 'lucide-react'
import { MockBadge } from '@/components/os/MockBadge'
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { transactionSchemas } from '@/data/runtime.mock'
import { isTerminal } from '../engine'
import { cancel, pause, resume, retry, useRuntime } from '../store'
import { AuditList } from './AuditList'
import { ExecutionTimeline, StepDetail } from './ExecutionTimeline'
import { approvalStatusMeta, executionStatusMeta, formatDateTime, formatDuration, useRuntimeLinks } from './meta'
import { OutcomeView } from './OutcomeView'

/** One consistent execution view for every application: summary, controls, timeline, approvals, outcome, audit. */
export function ExecutionDetail({ executionId, onBack }: { executionId: string; onBack?: () => void }) {
  const state = useRuntime()
  const links = useRuntimeLinks()
  const exec = state.executions.find((e) => e.id === executionId)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState('timeline')

  if (!exec) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Execution not found</EmptyTitle>
          <EmptyDescription>It may have been cleared by a demo reset.</EmptyDescription>
        </EmptyHeader>
        {onBack && (
          <Button size="sm" variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
      </Empty>
    )
  }

  const current = exec.steps[exec.current]
  const step = exec.steps.find((s) => s.id === selected) ?? current
  const approvals = exec.approvalIds.map((id) => state.approvals.find((a) => a.id === id)).filter((a) => a !== undefined)
  const pending = approvals.find((a) => a.status === 'pending' || a.status === 'info-requested')
  const outcome = state.outcomes.find((o) => o.id === exec.outcomeId)
  const events = state.audit.filter((e) => e.executionId === exec.id)
  const schema = transactionSchemas[exec.domain]
  const meta = executionStatusMeta[exec.status]
  const retryable = exec.status === 'failed' && current?.error?.retryable

  return (
    <div className="@container space-y-4">
      <header className="space-y-2">
        {onBack && (
          <Button size="xs" variant="ghost" onClick={onBack} className="-ml-2">
            <ArrowLeft /> All executions
          </Button>
        )}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {exec.transaction.id}
              <StatusBadge tone={meta.tone} pulse={exec.status === 'running'} aria-label={`Status: ${meta.label}`}>
                {meta.label}
              </StatusBadge>
            </h3>
            <p className="text-sm text-muted-foreground">
              {exec.id} ·{' '}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openApplication(exec.appId)}>
                {exec.appName}
              </button>{' '}
              · blueprint v{exec.blueprintVersion} · {exec.transaction.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Execution controls">
            {(exec.status === 'running' || exec.status === 'queued') && (
              <Button size="sm" variant="outline" onClick={() => pause(exec.id)}>
                <Pause /> Pause
              </Button>
            )}
            {exec.status === 'paused' && (
              <Button size="sm" variant="outline" onClick={() => resume(exec.id)}>
                <Play /> Resume
              </Button>
            )}
            {retryable && (
              <Button size="sm" variant="outline" onClick={() => retry(exec.id)}>
                <RotateCcw /> Retry step
              </Button>
            )}
            {!isTerminal(exec.status) && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(true)}>
                <Ban /> Cancel
              </Button>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-card p-3 text-sm @2xl:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">{isTerminal(exec.status) ? 'Stopped at' : 'Current step'}</dt>
            <dd className="font-medium">{exec.status === 'completed' ? 'All steps finished' : (current?.name ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Submitted</dt>
            <dd>{formatDateTime(exec.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="tabular-nums">{formatDuration(exec.submittedAt, exec.endedAt) || 'In progress'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Outcome</dt>
            <dd>{outcome ? outcome.label : exec.status === 'failed' ? 'None — execution failed' : exec.status === 'cancelled' ? 'None — cancelled' : 'Not yet'}</dd>
          </div>
        </dl>
        {pending && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/50 bg-warning-soft/50 px-3 py-2 text-sm">
            <Hand aria-hidden className="size-4 text-warning-ink" />
            <span className="min-w-0 flex-1">
              Paused for a human decision: <span className="font-medium">{pending.type}</span> — {approvalStatusMeta[pending.status].label.toLowerCase()}, assigned to {pending.reviewer}.
            </span>
            <Button size="sm" onClick={() => links.openApproval(pending.id)}>
              Review approval
            </Button>
          </div>
        )}
        {exec.status === 'paused' && <p className="text-sm text-muted-foreground">Paused by you. Nothing is processed until you resume.</p>}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto! max-w-full flex-wrap">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="approvals">Approvals · {approvals.length}</TabsTrigger>
          <TabsTrigger value="outcome">Outcome</TabsTrigger>
          <TabsTrigger value="audit">Audit trail · {events.length}</TabsTrigger>
          <TabsTrigger value="transaction">Transaction</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <div className="grid gap-4 @3xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <ExecutionTimeline execution={exec} selectedId={step?.id ?? null} onSelect={setSelected} />
            {step && <StepDetail execution={exec} step={step} onRetry={retryable && step === current ? () => retry(exec.id) : undefined} />}
          </div>
        </TabsContent>
        <TabsContent value="approvals">
          {approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval was needed: none of the workflow’s approval conditions applied{isTerminal(exec.status) ? '' : ' so far'}.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card" aria-label="Approvals for this execution">
              {approvals.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{a.type}</span>
                    <span className="block text-xs text-muted-foreground">
                      {a.id} · {a.reviewer} · requested {formatDateTime(a.submittedAt)}
                      {a.decidedAt ? ` · decided ${formatDateTime(a.decidedAt)} by ${a.history.at(-1)?.actor}` : ''}
                    </span>
                  </span>
                  <StatusBadge tone={approvalStatusMeta[a.status].tone}>{approvalStatusMeta[a.status].label}</StatusBadge>
                  <Button size="xs" variant="outline" onClick={() => links.openApproval(a.id)}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="outcome">
          {outcome ? (
            <OutcomeView outcome={outcome} execution={exec} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {exec.status === 'failed'
                ? 'No business outcome: the execution failed before a decision. See the failed step on the timeline.'
                : exec.status === 'cancelled'
                  ? 'No business outcome: the execution was cancelled.'
                  : 'The outcome is recorded when the execution completes.'}
            </p>
          )}
        </TabsContent>
        <TabsContent value="audit">
          <AuditList events={events} showExecution={false} label="Execution audit trail" />
        </TabsContent>
        <TabsContent value="transaction">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Submitted {schema.noun}</h4>
              <MockBadge className="ml-auto" />
            </div>
            <dl className="grid gap-3 @xl:grid-cols-2">
              {schema.fields.map((f) => (
                <div key={f.id}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm">{exec.transaction.fields[f.id] || '—'}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-muted-foreground">Documents</dt>
                <dd className="text-sm">{exec.transaction.documents.join(', ') || 'None'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Submitted by</dt>
                <dd className="text-sm">{exec.transaction.submittedBy}</dd>
              </div>
            </dl>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {exec.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              The remaining steps will not run{pending ? ` and approval ${pending.id} will be withdrawn` : ''}. Cancellation is recorded in the audit trail and cannot be undone. Simulated: no real transaction is affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea aria-label="Reason for cancelling (optional)" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancel(exec.id, reason.trim())
                setReason('')
              }}
            >
              Cancel execution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
