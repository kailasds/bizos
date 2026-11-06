import type { ReactNode } from 'react'
import { AlertTriangle, Check, CircleDashed, CircleSlash, Hand, Loader2, MinusCircle, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Execution, ExecutionStep, StepStatus } from '../types'
import { formatDuration, formatTime, stepStatusMeta, useRuntimeLinks } from './meta'

const stepIcon: Record<StepStatus, { icon: LucideIcon; className: string }> = {
  waiting: { icon: CircleDashed, className: 'text-muted-foreground/60' },
  running: { icon: Loader2, className: 'animate-spin text-info motion-reduce:animate-none' },
  completed: { icon: Check, className: 'text-success-ink' },
  skipped: { icon: MinusCircle, className: 'text-muted-foreground' },
  failed: { icon: AlertTriangle, className: 'text-danger-ink' },
  'awaiting-approval': { icon: Hand, className: 'text-warning-ink' },
  cancelled: { icon: CircleSlash, className: 'text-muted-foreground' },
}

/** Vertical timeline of an execution. Selecting a step reveals what happened and why. */
export function ExecutionTimeline({ execution, selectedId, onSelect }: { execution: Execution; selectedId: string | null; onSelect: (stepId: string) => void }) {
  return (
    <ol aria-label="Execution timeline" className="relative space-y-1">
      {execution.steps.map((step, i) => {
        const { icon: Icon, className } = stepIcon[step.status]
        const selected = selectedId === step.id
        const duration = formatDuration(step.startedAt, step.endedAt)
        return (
          <li key={step.id} className="relative">
            {i < execution.steps.length - 1 && <span aria-hidden className="absolute top-8 bottom-[-0.25rem] left-[1.15rem] w-px bg-border" />}
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`Step ${i + 1}: ${step.name} — ${stepStatusMeta[step.status].label}`}
              onClick={() => onSelect(step.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50',
                selected && 'bg-accent/70 hover:bg-accent/70',
              )}
            >
              <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-card">
                <Icon aria-hidden className={cn('size-3.5', className)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={cn('text-sm font-medium', step.status === 'waiting' && 'text-muted-foreground')}>{step.name}</span>
                  {(step.status === 'running' || step.status === 'awaiting-approval' || step.status === 'failed') && (
                    <StatusBadge tone={stepStatusMeta[step.status].tone} pulse={step.status === 'running'}>
                      {stepStatusMeta[step.status].label}
                    </StatusBadge>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {step.resource?.name ?? 'Application Runtime'}
                  {step.status === 'skipped' ? ' · skipped' : ''}
                  {duration ? ` · ${duration}` : step.startedAt && step.status !== 'skipped' ? ` · started ${formatTime(step.startedAt)}` : ''}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** What a step did, in observable terms: inputs, outputs, evidence, and why the next step ran. */
export function StepDetail({ execution, step, onRetry }: { execution: Execution; step: ExecutionStep; onRetry?: () => void }) {
  const links = useRuntimeLinks()
  const next = execution.steps[execution.steps.indexOf(step) + 1]
  return (
    <section aria-label={`Step details: ${step.name}`} className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{step.name}</h4>
          <p className="text-xs text-muted-foreground">{step.description}</p>
        </div>
        <StatusBadge tone={stepStatusMeta[step.status].tone}>{stepStatusMeta[step.status].label}</StatusBadge>
      </header>

      {step.error && (
        <div role="alert" className="space-y-2 rounded-md border border-danger/40 bg-danger-soft/50 p-3 text-sm">
          <p className="font-medium text-danger-ink">What failed: {step.error.what}</p>
          <dl className="grid gap-2 @xl:grid-cols-2">
            <Field label="Where">{`Step ${execution.steps.indexOf(step) + 1}, “${step.name}”${step.resource ? ` — ${step.resource.name}` : ''}`}</Field>
            <Field label="Impact">{step.error.impact}</Field>
            <Field label="Suggested next action">{step.error.nextAction}</Field>
            <Field label="Retry">{step.error.retryable ? 'Available' : 'Not available for this failure'}</Field>
          </dl>
          {step.error.retryable && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry “{step.name}”
            </Button>
          )}
        </div>
      )}

      <dl className="grid gap-3 @xl:grid-cols-2">
        <Field label="Performed by">
          {step.resource && step.resource.kind !== 'person' ? (
            <button type="button" className="text-left font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:underline" onClick={() => links.openResource(step.resource!.id)}>
              {step.resource.name} {step.resource.version}
            </button>
          ) : (
            (step.resource?.name ?? 'Application Runtime')
          )}
          {step.resource && <span className="block text-xs text-muted-foreground">{step.resource.kind === 'person' ? 'Human decision' : `${step.resource.kind} · ${step.resource.owner}`}</span>}
        </Field>
        <Field label="Timing">
          {step.startedAt ? `${formatTime(step.startedAt)}${step.endedAt ? ` → ${formatTime(step.endedAt)}` : ' → in progress'}` : 'Not started'}
          {step.attempts > 1 && <span className="block text-xs text-muted-foreground">{step.attempts} attempts</span>}
        </Field>
        {step.input && <Field label="What it received">{step.input}</Field>}
        {step.output && <Field label="What it produced">{step.output}</Field>}
        {step.status === 'running' && <Field label="What is happening">Processing now.</Field>}
        {step.status === 'awaiting-approval' && step.approvalId && (
          <Field label="Waiting for">
            <button type="button" className="text-left font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:underline" onClick={() => links.openApproval(step.approvalId!)}>
              Approval {step.approvalId}
            </button>
          </Field>
        )}
        {step.explanation && <Field label={step.status === 'skipped' || step.status === 'cancelled' ? 'Why' : next ? `Why “${next.name}” runs next` : 'What happens next'}>{step.explanation}</Field>}
      </dl>

      {step.evidence.length > 0 && (
        <div>
          <h5 className="text-xs text-muted-foreground">Evidence</h5>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {step.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {step.approvalId && step.status !== 'awaiting-approval' && (
        <Button size="xs" variant="ghost" onClick={() => links.openApproval(step.approvalId!)}>
          Open approval {step.approvalId}
        </Button>
      )}
    </section>
  )
}
