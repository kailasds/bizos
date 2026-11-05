import { CheckCircle2, Circle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/** The visible sequence of a simulated operation: done, in progress, waiting. */
export function StepList({ steps, current, done = false, label }: { steps: string[]; current: number; done?: boolean; label: string }) {
  return (
    <ol aria-label={label} aria-live="polite" className="space-y-2">
      {steps.map((step, i) => {
        const state = done || i < current ? 'done' : i === current ? 'active' : 'waiting'
        return (
          <li key={step} className={cn('flex items-center gap-2.5 text-sm', state === 'waiting' && 'text-muted-foreground')}>
            {state === 'done' ? (
              <CheckCircle2 aria-label="Done" className="size-4 shrink-0 text-success" />
            ) : state === 'active' ? (
              <Spinner className="shrink-0 text-primary" aria-label="In progress" />
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
