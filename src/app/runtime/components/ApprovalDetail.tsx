import { useState } from 'react'
import { ArrowLeft, Check, MessageSquareMore, Sparkles, X } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { approve, reject, requestInfo, simulateInfoResponse, useRuntime } from '../store'
import { approvalStatusMeta, executionStatusMeta, formatDateTime, useRuntimeLinks } from './meta'

type Pending = 'reject' | 'info' | null

/** Everything a reviewer needs to decide, and the decision controls. Decisions resume or stop the execution. */
export function ApprovalDetail({ approvalId, onBack }: { approvalId: string; onBack?: () => void }) {
  const state = useRuntime()
  const links = useRuntimeLinks()
  const approval = state.approvals.find((a) => a.id === approvalId)
  const [mode, setMode] = useState<Pending>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!approval) return <p className="text-sm text-muted-foreground">Approval not found. It may have been cleared by a demo reset.</p>

  const exec = state.executions.find((e) => e.id === approval.executionId)
  const step = exec?.steps.find((s) => s.id === approval.stepId)
  const open = approval.status === 'pending'
  const r = approval.recommendation

  const confirm = () => {
    if (!comment.trim()) return setError(mode === 'reject' ? 'Give a reason for the rejection.' : 'Say what information is needed.')
    if (mode === 'reject') reject(approval.id, comment.trim())
    else requestInfo(approval.id, comment.trim())
    setMode(null)
    setComment('')
    setError(null)
  }

  return (
    <div className="@container space-y-4">
      {onBack && (
        <Button size="xs" variant="ghost" className="-ml-2" onClick={onBack}>
          <ArrowLeft /> Approval queue
        </Button>
      )}
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{approval.type}</h3>
          <p className="text-sm text-muted-foreground">
            {approval.id} · {approval.transactionId} · assigned to {approval.reviewer} · requested {formatDateTime(approval.submittedAt)}
          </p>
        </div>
        {approval.priority === 'high' && <StatusBadge tone="warning">High priority</StatusBadge>}
        <StatusBadge tone={approvalStatusMeta[approval.status].tone}>{approvalStatusMeta[approval.status].label}</StatusBadge>
      </header>

      <section aria-label="Business context" className="space-y-2 rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold">Business context</h4>
        <dl className="grid gap-3 text-sm @xl:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">What is being requested</dt>
            <dd>
              A decision at “{step?.name}” for {exec?.transaction.label} ({approval.transactionId})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Why approval is needed</dt>
            <dd>
              <ul className="list-disc space-y-0.5 pl-4">
                {approval.reasons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Application</dt>
            <dd>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openApplication(approval.appId)}>
                {exec?.appName ?? approval.appId}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Affected execution</dt>
            <dd>
              {exec ? (
                <>
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openExecution(exec.id)}>
                    {exec.id}
                  </button>{' '}
                  — {executionStatusMeta[exec.status].label.toLowerCase()}
                </>
              ) : (
                approval.executionId
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label="Recommendation" className="space-y-3 rounded-lg border border-info/30 bg-info-soft/30 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-info-ink" />
          <h4 className="text-sm font-semibold">Recommendation</h4>
        </div>
        <p className="text-sm">
          <span className="font-medium">{r.decision}.</span> {r.explanation}
        </p>
        {r.attention.length > 0 && (
          <div>
            <h5 className="text-xs text-muted-foreground">Needs your attention</h5>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
              {r.attention.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h5 className="text-xs text-muted-foreground">Supporting evidence</h5>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {r.evidence.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-xs text-muted-foreground">Relevant policy</h5>
          <p className="text-sm">{r.policy}</p>
        </div>
      </section>

      {open && !mode && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Decision">
          <Button onClick={() => approve(approval.id, '')}>
            <Check /> Approve
          </Button>
          <Button variant="outline" onClick={() => setMode('reject')}>
            <X /> Reject
          </Button>
          <Button variant="ghost" onClick={() => setMode('info')}>
            <MessageSquareMore /> Request more information
          </Button>
        </div>
      )}
      {open && mode && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <Label htmlFor="approval-comment">{mode === 'reject' ? 'Reason for rejecting (required)' : 'What information is needed? (required)'}</Label>
          <Textarea id="approval-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === 'reject' ? 'The execution continues only to inform the customer, and the outcome is recorded as declined.' : 'The execution keeps waiting until the information arrives.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={confirm}>{mode === 'reject' ? 'Reject' : 'Send request'}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setMode(null)
                setError(null)
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )}
      {approval.status === 'info-requested' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <span className="min-w-0 flex-1">Waiting for {exec?.transaction.submittedBy ?? 'the submitter'} to respond. The execution stays paused.</span>
          <Button size="sm" variant="outline" onClick={() => simulateInfoResponse(approval.id)}>
            Simulate the response
          </Button>
        </div>
      )}

      <section aria-label="Approval history">
        <h4 className="mb-1 text-sm font-semibold">History</h4>
        <ol className="space-y-1 text-sm">
          {approval.history.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDateTime(h.at)}</span>
              <span>
                <span className="font-medium">{h.action}</span> · {h.actor}
                {h.comment && <span className="block text-muted-foreground">“{h.comment}”</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
