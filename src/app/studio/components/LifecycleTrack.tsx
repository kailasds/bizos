import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LIFECYCLE, lifecycleMeta } from '../lifecycle'
import type { Lifecycle } from '../types'

/**
 * Draft → Designing → Validating → Ready → Published → Changes pending.
 * "Changes pending" is reached only after a publication.
 */
export function LifecycleTrack({ lifecycle, compact = false }: { lifecycle: Lifecycle; compact?: boolean }) {
  const current = LIFECYCLE.indexOf(lifecycle)
  const states = lifecycle === 'changes-pending' ? LIFECYCLE : LIFECYCLE.filter((s) => s !== 'changes-pending')
  return (
    <ol aria-label="Application lifecycle" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {states.map((state, i) => {
        const index = LIFECYCLE.indexOf(state)
        const done = index < current
        const isCurrent = state === lifecycle
        return (
          <li key={state} className="flex items-center gap-1" aria-current={isCurrent ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('h-px w-3', done || isCurrent ? 'bg-foreground/30' : 'bg-border')} />}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs',
                isCurrent ? 'bg-accent font-medium text-accent-foreground ring-1 ring-primary/30' : done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {done && <Check aria-hidden className="size-3 text-success" />}
              {lifecycleMeta[state].label}
            </span>
          </li>
        )
      })}
      {!compact && <span className="sr-only">Current state: {lifecycleMeta[lifecycle].label}</span>}
    </ol>
  )
}
