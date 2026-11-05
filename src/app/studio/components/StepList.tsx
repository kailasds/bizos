import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/** The visible sequence of a simulated operation: done, in progress, failed, waiting. */
export function StepList({
  steps,
  current,
  done = false,
  failedAt,
  label,
}: {
  steps: string[]
  current: number
  done?: boolean
  /** Index of a step that failed; later steps are shown as not run. */
  failedAt?: number | null
  label: string
}) {
  return (
    <ol aria-label={label} aria-live="polite" className="space-y-2">
      {steps.map((step, i) => {
        const state =
          failedAt != null ? (i < failedAt ? 'done' : i === failedAt ? 'failed' : 'waiting') : done || i < current ? 'done' : i === current ? 'active' : 'waiting'
        return (
          <li key={step} className={cn('flex items-center gap-2.5 text-sm', state === 'waiting' && 'text-muted-foreground', state === 'failed' && 'text-danger-ink')}>
            {state === 'done' ? (
              <CheckCircle2 aria-label="Done" className="size-4 shrink-0 text-success" />
            ) : state === 'active' ? (
              <Spinner className="shrink-0 text-primary" aria-label="In progress" />
            ) : state === 'failed' ? (
              <XCircle aria-label="Failed" className="size-4 shrink-0 text-danger" />
            ) : (
              <Circle aria-label="Waiting" className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            {step}
          </li>
        )
      })}
    </ol>
  )
}
