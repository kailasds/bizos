import { ChevronRight, Cpu, Settings2, User, type LucideIcon } from 'lucide-react'
import type { FlowStep, StepActor } from '@/app/blueprint/types'
import { cn } from '@/lib/utils'

const actorMeta: Record<StepActor, { icon: LucideIcon; label: string; className: string }> = {
  automated: { icon: Cpu, label: 'Automated', className: 'border-info/30 bg-info-soft/60' },
  system: { icon: Settings2, label: 'Rules / system', className: 'border-border bg-muted/60' },
  human: { icon: User, label: 'A person decides', className: 'border-warning/50 bg-warning-soft' },
}

/**
 * Business view of a workflow: who does each step, in order. Deliberately not a
 * technical architecture diagram.
 */
export function FlowDiagram({ steps, roleLabel, label }: { steps: FlowStep[]; roleLabel?: (roleId: string) => string; label: string }) {
  return (
    <figure aria-label={label}>
      <ol className="flex flex-wrap items-stretch gap-y-3">
        {steps.map((step, i) => {
          const meta = actorMeta[step.actor]
          const Icon = meta.icon
          return (
            <li key={step.id} className="flex items-center">
              <div className={cn('flex min-h-14 w-36 flex-col justify-center rounded-lg border px-2.5 py-2', meta.className)}>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon aria-hidden className="size-3" />
                  {meta.label}
                </span>
                <span className="text-sm leading-tight font-medium">{step.name}</span>
                {step.actor === 'human' && (
                  <span className="mt-0.5 text-[11px] text-warning-ink">
                    {step.role ? (roleLabel?.(step.role) ?? step.role) : 'Approver to be decided'}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && <ChevronRight aria-hidden className="mx-0.5 size-4 shrink-0 text-muted-foreground" />}
            </li>
          )
        })}
      </ol>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.keys(actorMeta) as StepActor[]).map((a) => {
          const Icon = actorMeta[a].icon
          return (
            <span key={a} className="flex items-center gap-1.5">
              <span className={cn('flex size-4 items-center justify-center rounded border', actorMeta[a].className)}>
                <Icon aria-hidden className="size-2.5" />
              </span>
              {actorMeta[a].label}
            </span>
          )
        })}
      </figcaption>
    </figure>
  )
}
