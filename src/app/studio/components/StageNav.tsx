import { AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import { STAGES, type StageId, type StudioProject } from '../types'

const statusLabel = { complete: 'Completed', 'needs-review': 'Needs review', 'not-started': 'Not started' } as const

/**
 * Centred stepper. Not a wizard: every stage is reachable at any time. Each step shows its
 * icon, a completion or review marker, and its label; the connector fills as stages complete.
 */
export function StageNav({ project, active, onSelect }: { project: StudioProject | null; active: StageId; onSelect: (s: StageId) => void }) {
  return (
    <nav aria-label="Studio stages" className="no-scrollbar shrink-0 overflow-x-auto border-b bg-card/80 px-4 py-3">
      <ol className="mx-auto flex w-max min-w-full max-w-4xl items-start justify-center">
        {STAGES.map((stage, i) => {
          const progress = project?.progress[stage] ?? 'not-started'
          const current = stage === active
          const Icon = stageMeta[stage].icon
          const prevDone = i > 0 && (project?.progress[STAGES[i - 1]] ?? 'not-started') === 'complete'
          return (
            <li key={stage} className="flex items-start">
              {i > 0 && (
                <span aria-hidden className="mt-[1.125rem] h-0.5 w-6 rounded-full bg-border @4xl:w-12 @6xl:w-16">
                  <span className={cn('block h-full rounded-full bg-primary transition-[width] duration-300', prevDone ? 'w-full' : 'w-0')} />
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelect(stage)}
                aria-current={current ? 'step' : undefined}
                aria-label={`${i + 1}. ${stageMeta[stage].label} — ${current ? 'current, ' : ''}${statusLabel[progress]}`}
                className="group flex w-16 flex-col items-center gap-1.5 rounded-lg px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 @4xl:w-20"
              >
                <span
                  aria-hidden
                  className={cn(
                    'relative flex size-9 items-center justify-center rounded-full border-2 transition-colors',
                    progress === 'complete' && !current && 'border-primary bg-primary text-primary-foreground',
                    progress === 'needs-review' && !current && 'border-warning bg-warning-soft text-warning-ink',
                    progress === 'not-started' && !current && 'border-border bg-card text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground',
                    current && 'border-primary bg-accent text-accent-foreground shadow-[0_0_0_4px_var(--accent)]',
                  )}
                >
                  <Icon className="size-4" />
                  {progress === 'complete' && current && (
                    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                  {progress === 'needs-review' && (
                    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-warning text-foreground ring-2 ring-card">
                      <AlertTriangle className="size-2.5" />
                    </span>
                  )}
                </span>
                <span className={cn('text-xs whitespace-nowrap', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{stageMeta[stage].label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
