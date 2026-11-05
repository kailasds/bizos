import { AlertTriangle, Cpu, Settings2, User, type LucideIcon } from 'lucide-react'
import type { FlowStep, StepActor } from '@/app/blueprint/types'
import type { StepInsight } from '@/app/services/mock/architecture-service'
import { cn } from '@/lib/utils'

const lanes: { actor: StepActor; label: string; icon: LucideIcon; band: string; chip: string }[] = [
  { actor: 'human', label: 'People', icon: User, band: 'bg-warning-soft/30', chip: 'border-warning/50 bg-card' },
  { actor: 'automated', label: 'AI and automation', icon: Cpu, band: 'bg-info-soft/30', chip: 'border-info/30 bg-card' },
  { actor: 'system', label: 'Rules and systems', icon: Settings2, band: 'bg-muted/50', chip: 'border-border bg-card' },
]

/**
 * Swimlane view of an approach: steps run top to bottom; the column shows who does each
 * step. Makes the operating model visible at a glance, at any width and step count.
 */
export function WorkflowLanes({
  steps,
  insights,
  roleLabel,
  selectedStepId,
  onSelectStep,
  label,
}: {
  steps: FlowStep[]
  insights?: StepInsight[]
  roleLabel: (roleId: string) => string
  selectedStepId?: string | null
  onSelectStep?: (stepId: string) => void
  label: string
}) {
  const insightFor = (id: string) => insights?.find((i) => i.step.id === id)
  const count = (actor: StepActor) => steps.filter((s) => s.actor === actor).length
  return (
    <figure aria-label={label} className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[2rem_repeat(3,minmax(0,1fr))]">
        <div className="border-b bg-chrome" />
        {lanes.map((lane) => {
          const Icon = lane.icon
          return (
            <div key={lane.actor} className="flex items-center gap-1.5 border-b border-l bg-chrome px-2 py-2 text-xs font-medium">
              <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{lane.label}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">{count(lane.actor)}</span>
            </div>
          )
        })}
        {steps.map((step, i) => {
          const insight = insightFor(step.id)
          const selected = selectedStepId === step.id
          return (
            <div key={step.id} className="contents">
              <div className="flex items-center justify-center border-b text-xs text-muted-foreground tabular-nums last:border-b-0">{i + 1}</div>
              {lanes.map((lane) => (
                <div key={lane.actor} className={cn('border-b border-l px-1.5 py-1', lane.band)}>
                  {step.actor === lane.actor && (
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Step ${i + 1}: ${step.name}`}
                      onClick={() => onSelectStep?.(step.id)}
                      disabled={!onSelectStep}
                      className={cn(
                        'flex w-full flex-col items-start rounded-md border px-2 py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
                        lane.chip,
                        selected && 'ring-2 ring-primary',
                      )}
                    >
                      <span className="text-sm leading-tight font-medium">{step.name}</span>
                      {step.actor === 'human' ? (
                        <span className={cn('text-[11px]', step.role ? 'text-muted-foreground' : 'text-warning-ink')}>
                          {step.role ? roleLabel(step.role) : 'Approver to be decided'}
                        </span>
                      ) : insight?.missing ? (
                        <span className="flex items-center gap-1 text-[11px] text-warning-ink">
                          <AlertTriangle aria-hidden className="size-3" /> New worker needed
                        </span>
                      ) : insight?.resource ? (
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">{insight.resource.name}</span>
                      ) : null}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </figure>
  )
}
