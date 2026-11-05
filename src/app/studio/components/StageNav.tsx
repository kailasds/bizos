import { AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import { STAGES, type StageId, type StudioProject } from '../types'

const statusLabel = { complete: 'Completed', 'needs-review': 'Needs review', 'not-started': 'Not started' } as const

/**
 * Progress navigation. Not a wizard: every stage is reachable at any time. Shows
 * completed, current, pending and needs-review states.
 */
export function StageNav({ project, active, onSelect }: { project: StudioProject | null; active: StageId; onSelect: (s: StageId) => void }) {
  return (
    <nav aria-label="Studio stages" className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-3 py-2">
      {STAGES.map((stage, i) => {
        const progress = project?.progress[stage] ?? 'not-started'
        const current = stage === active
        return (
          <div key={stage} className="flex shrink-0 items-center gap-1">
            {i > 0 && <span aria-hidden className={cn('h-px w-3 @5xl:w-6', progress === 'complete' ? 'bg-success/50' : 'bg-border')} />}
            <button
              type="button"
              onClick={() => onSelect(stage)}
              aria-current={current ? 'step' : undefined}
              aria-label={`${i + 1}. ${stageMeta[stage].label} — ${current ? 'current, ' : ''}${statusLabel[progress]}`}
              className={cn(
                'flex items-center gap-2 rounded-lg py-1.5 pr-3 pl-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                current ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                  progress === 'complete' && 'bg-success text-white',
                  progress === 'needs-review' && 'bg-warning-soft text-warning-ink ring-1 ring-warning',
                  progress === 'not-started' && (current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground ring-1 ring-border'),
                )}
              >
                {progress === 'complete' ? <Check className="size-3" strokeWidth={3} /> : progress === 'needs-review' ? <AlertTriangle className="size-3" /> : i + 1}
              </span>
              {stageMeta[stage].label}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
