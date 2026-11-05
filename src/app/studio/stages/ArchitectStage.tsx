import { ArrowRight, Check, Star } from 'lucide-react'
import type { AutomationLevel, SolutionOption } from '@/app/blueprint/types'
import { Button } from '@/components/ui/button'
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { FlowDiagram } from '../components/FlowDiagram'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { capabilityLabel } from '../services/intelligence'
import { useStudio } from '../use-studio'

const automationMeta: Record<AutomationLevel, { label: string; level: number }> = {
  assisted: { label: 'Assisted', level: 1 },
  balanced: { label: 'Balanced', level: 2 },
  extensive: { label: 'Extensive', level: 3 },
}

/** Qualitative automation level — deliberately not a percentage. */
function AutomationLevelIndicator({ level }: { level: AutomationLevel }) {
  const meta = automationMeta[level]
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('h-1.5 w-4 rounded-full', n <= meta.level ? 'bg-primary' : 'bg-muted ring-1 ring-border')} />
        ))}
      </span>
      {meta.label} automation
    </span>
  )
}

function Row({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-t pt-3">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const discoverySteps = ['Searching Agent Control Plane', 'Searching AI Workers Platform', 'Checking connectors and domain packs', 'Comparing capability contracts']

export function ArchitectStage() {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(600)

  if (!project?.architecture) {
    return <StagePrerequisite stage="architect" requires="define" message="Confirm the requirement specification first. Approaches are designed to answer it." />
  }

  const { options, selectedOptionId } = project.architecture
  const selected = options.find((o) => o.id === selectedOptionId)
  const scenario = getScenario(project.scenarioId)
  const roleLabel = (id: string) => project.requirements?.users.find((u) => u.id === id)?.label ?? id
  const select = (o: SolutionOption) => dispatch({ type: 'architect/select', optionId: o.id })

  return (
    <StageFrame
      stage="architect"
      footer={
        sim.running ? (
          <div className="mr-auto">
            <StepList label="Discovering resources" steps={discoverySteps} current={sim.step} />
          </div>
        ) : (
          <>
            {!selected && <span className="mr-auto text-sm text-muted-foreground">Select an approach to continue.</span>}
            <Button disabled={!selected} onClick={() => sim.run(discoverySteps.length, () => dispatch({ type: 'architect/confirm' }))}>
              Use this approach — find resources
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      <div
        role="radiogroup"
        aria-label="Solution approaches"
        className={cn('grid gap-x-4 gap-y-0', options.length === 3 ? '@4xl:grid-cols-3' : '@3xl:grid-cols-2')}
      >
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId
          return (
            <article
              key={option.id}
              aria-label={option.name}
              className={cn(
                'row-span-7 mb-4 grid grid-rows-subgrid gap-3 rounded-xl border p-4',
                isSelected ? 'border-primary/60 bg-accent/40 ring-1 ring-primary/30' : 'bg-card',
              )}
            >
              <div>
                {option.recommended ? (
                  <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Star aria-hidden className="size-3" />
                    Recommended
                  </span>
                ) : (
                  <span className="mb-1 block h-4" aria-hidden />
                )}
                <h3 className="text-base font-semibold">{option.name}</h3>
                <p className="text-sm text-muted-foreground">{option.tagline}</p>
              </div>
              <AutomationLevelIndicator level={option.automation} />
              <p className="text-sm">{option.summary}</p>
              <Row title="Where people review" items={option.humanReview} />
              <Row title="Benefits" items={option.benefits} />
              <Row title="Trade-offs" items={option.tradeOffs} />
              <div className="flex flex-col justify-end gap-3">
                <Row title="Depends on" items={option.dependencies} />
                {option.recommended && <p className="text-xs text-muted-foreground">Why recommended: {option.recommended.reason}</p>}
                <Button
                  role="radio"
                  aria-checked={isSelected}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => select(option)}
                >
                  {isSelected && <Check />}
                  {isSelected ? 'Selected' : 'Select this approach'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      {selected && scenario && (
        <section aria-label="How the selected approach works" className="mt-4 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">How “{selected.name}” works</h3>
          <p className="mb-4 text-sm text-muted-foreground">Each {scenario.entity.name.toLowerCase()} moves through these steps in order.</p>
          <FlowDiagram label={`${selected.name} workflow`} steps={selected.steps} roleLabel={roleLabel} />
          <div className="mt-4 border-t pt-3">
            <h4 className="text-xs font-medium text-muted-foreground">Capabilities this approach needs</h4>
            <p className="mt-1 text-sm">
              {[...new Set([...selected.steps.map((s) => s.capabilityId), ...selected.supportingCapabilities])]
                .map((c) => capabilityLabel(scenario, c))
                .join(' · ')}
            </p>
          </div>
        </section>
      )}
    </StageFrame>
  )
}
