import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Info, Star } from 'lucide-react'
import type { AutomationLevel, SolutionOption } from '@/app/blueprint/types'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { approachInsights, type StepInsight } from '@/app/services/mock/architecture-service'
import { capabilityLabel } from '@/app/services/mock/capability-analysis-service'
import { InfoTip } from '@/components/os/InfoTip'
import { Button } from '@/components/ui/button'
import { getScenario } from '@/data/studio-scenarios.mock'
import { resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { WorkflowLanes } from '../components/WorkflowLanes'
import { useSimulation } from '../hooks/use-simulation'
import type { StudioScenario } from '../types'
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

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
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

function StepInspector({
  insight,
  scenario,
  roleLabel,
  onOpenResource,
}: {
  insight: StepInsight
  scenario: StudioScenario
  roleLabel: (id: string) => string
  onOpenResource: (r: PlatformResource) => void
}) {
  const { step, resource } = insight
  const contract = scenario.contracts[step.capabilityId]
  const field = (id: string) => scenario.entity.fields.find((f) => f.id === id)?.label ?? id
  return (
    <section aria-label={`Step details: ${step.name}`} className="rounded-lg border bg-muted/30 p-4 text-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-semibold">{step.name}</h4>
        <span className="text-xs text-muted-foreground">
          {step.actor === 'human' ? 'A person decides' : step.actor === 'system' ? 'Rules or systems' : 'AI and automation'} · {capabilityLabel(scenario, step.capabilityId)}
        </span>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 @3xl:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">{step.actor === 'human' ? 'Decided by' : 'Done by'}</dt>
          <dd>
            {step.actor === 'human'
              ? step.role
                ? roleLabel(step.role)
                : `To be decided: ${(step.roleCandidates ?? []).map(roleLabel).join(' or ')}`
              : resource
                ? `${resource.name} (${resourceKindLabel[resource.kind]})`
                : 'No existing resource — a new worker would be needed'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Uses</dt>
          <dd>{contract?.inputs.length ? contract.inputs.map(field).join(', ') : 'Starts the case'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Produces</dt>
          <dd>{contract?.outputs.length ? contract.outputs.map(field).join(', ') : 'An update for people'}</dd>
        </div>
      </dl>
      {resource && step.actor !== 'human' && (
        <Button size="xs" variant="outline" className="mt-3" onClick={() => onOpenResource(resource)}>
          About {resource.name}
        </Button>
      )}
    </section>
  )
}

function CompareTable({ options, scenario, selectedId, onFocus }: { options: SolutionOption[]; scenario: StudioScenario; selectedId: string | null; onFocus: (id: string) => void }) {
  const rows: { label: string; render: (o: SolutionOption) => ReactNode }[] = [
    { label: 'Operating model', render: (o) => o.operatingModel ?? o.tagline },
    { label: 'How it addresses the problem', render: (o) => o.howItAddresses ?? o.summary },
    {
      label: 'Human involvement',
      render: (o) => {
        const h = o.steps.filter((s) => s.actor === 'human')
        return (
          <>
            <span className="font-medium tabular-nums">
              {h.length} of {o.steps.length} steps
            </span>{' '}
            <span className="text-muted-foreground">— {h.map((s) => s.name).join(', ')}</span>
          </>
        )
      },
    },
    { label: 'Automation', render: (o) => <AutomationLevelIndicator level={o.automation} /> },
    {
      label: 'New resources needed',
      render: (o) => {
        const n = approachInsights(scenario, o).newResources
        return n.length ? n.join(', ') : <span className="text-muted-foreground">None</span>
      },
    },
    { label: 'Advantages', render: (o) => o.benefits.join('; ') },
    { label: 'Trade-offs', render: (o) => o.tradeOffs.join('; ') },
    { label: 'Depends on', render: (o) => o.dependencies.join('; ') },
  ]
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Comparison of solution approaches</caption>
        <thead className="bg-chrome text-left">
          <tr className="border-b">
            <th className="w-40 px-3 py-2 text-xs font-medium text-muted-foreground" />
            {options.map((o) => (
              <th key={o.id} scope="col" className="px-3 py-2 align-top">
                <button type="button" onClick={() => onFocus(o.id)} className="text-left font-semibold outline-none hover:underline focus-visible:underline">
                  {o.name}
                </button>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs font-normal">
                  {o.recommended && <span className="text-primary">Recommended</span>}
                  {o.id === selectedId && <span className="text-success-ink">Selected</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b align-top last:border-0">
              <th scope="row" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                {row.label}
              </th>
              {options.map((o) => (
                <td key={o.id} className="px-3 py-2.5">
                  {row.render(o)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const discoverySteps = ['Searching Agent Control Plane', 'Searching AI Workers Platform', 'Checking connectors, services and domain packs', 'Comparing capability contracts']

export function ArchitectStage({ focusId, onFocus }: { focusId: string | null; onFocus: (id: string | null) => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(600)
  const [view, setView] = useState<'explore' | 'compare'>('explore')
  const [stepId, setStepId] = useState<string | null>(null)
  const [resource, setResource] = useState<PlatformResource | null>(null)

  if (!project?.architecture) {
    return <StagePrerequisite stage="architect" requires="define" message="Confirm the requirement specification first. Approaches are designed to answer it." />
  }
  const scenario = getScenario(project.scenarioId)
  if (!scenario) return null

  const { options, selectedOptionId } = project.architecture
  const selected = options.find((o) => o.id === selectedOptionId)
  const focused = options.find((o) => o.id === focusId) ?? selected ?? options.find((o) => o.recommended) ?? options[0]
  const insights = approachInsights(scenario, focused)
  const roleLabel = (id: string) => project.requirements?.users.find((u) => u.id === id)?.label ?? id
  const inspected = insights.steps.find((s) => s.step.id === stepId) ?? insights.steps.find((s) => s.step.actor === 'human') ?? insights.steps[0]

  const focus = (id: string) => {
    onFocus(id)
    setStepId(null)
    setView('explore')
  }

  return (
    <StageFrame
      stage="architect"
      aside={
        <div role="group" aria-label="View" className="flex gap-1">
          <Button size="sm" variant={view === 'explore' ? 'secondary' : 'ghost'} aria-pressed={view === 'explore'} onClick={() => setView('explore')}>
            Explore
          </Button>
          <Button size="sm" variant={view === 'compare' ? 'secondary' : 'ghost'} aria-pressed={view === 'compare'} onClick={() => setView('compare')}>
            Compare all
          </Button>
        </div>
      }
      footer={
        sim.running ? (
          <div className="mr-auto">
            <StepList label="Discovering resources" steps={discoverySteps} current={sim.step} />
          </div>
        ) : (
          <>
            {!selected && <span className="mr-auto text-sm text-muted-foreground">Select an approach to continue.</span>}
            <Button disabled={!selected} onClick={() => sim.run(discoverySteps.length, () => dispatch({ type: 'architect/confirm' }))}>
              {selected ? `Use ${selected.name} — find resources` : 'Find resources'}
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      <div role="tablist" aria-label="Solution approaches" className={cn('grid gap-2', options.length === 3 ? '@4xl:grid-cols-3' : '@3xl:grid-cols-2')}>
        {options.map((o) => {
          const humans = o.steps.filter((s) => s.actor === 'human').length
          const isFocused = view === 'explore' && o.id === focused.id
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={isFocused}
              onClick={() => focus(o.id)}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                isFocused ? 'border-primary/50 bg-accent/60' : 'bg-card hover:bg-muted/60',
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{o.name}</span>
                {o.recommended && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <Star aria-hidden className="size-3" /> Recommended
                  </span>
                )}
                {o.id === selectedOptionId && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-ink">
                    <Check aria-hidden className="size-3" /> Selected
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{o.operatingModel ?? o.tagline}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <AutomationLevelIndicator level={o.automation} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  People on {humans} of {o.steps.length} steps
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {view === 'compare' ? (
        <div className="mt-6">
          <CompareTable options={options} scenario={scenario} selectedId={selectedOptionId} onFocus={focus} />
        </div>
      ) : (
        <section role="tabpanel" aria-label={focused.name} className="mt-6 space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">{focused.name}</h3>
              <p className="text-sm text-muted-foreground">{focused.tagline}</p>
            </div>
            {focused.id === selectedOptionId ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success-soft px-3 text-sm font-medium text-success-ink">
                <Check aria-hidden className="size-4" /> Selected
              </span>
            ) : (
              <Button onClick={() => dispatch({ type: 'architect/select', optionId: focused.id })}>Select this approach</Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              Operating model
              <InfoTip label="Operating model">{focused.operatingModel ?? focused.summary}</InfoTip>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              How it addresses your problem
              <InfoTip label="How it addresses your problem">{focused.howItAddresses ?? focused.summary}</InfoTip>
            </span>
            {focused.recommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">
                <Info aria-hidden className="size-3.5" />
                Why recommended
                <InfoTip label="Why recommended">{focused.recommended.reason}</InfoTip>
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold">Main workflow</h4>
            </div>
            <WorkflowLanes
              label={`${focused.name} workflow`}
              steps={focused.steps}
              insights={insights.steps}
              roleLabel={roleLabel}
              selectedStepId={inspected?.step.id}
              onSelectStep={setStepId}
            />
            {inspected && <StepInspector insight={inspected} scenario={scenario} roleLabel={roleLabel} onOpenResource={setResource} />}
          </div>

          <div className="grid gap-6 @3xl:grid-cols-2 @5xl:grid-cols-4">
            <Bullets title="Where people are involved" items={focused.humanReview} />
            <Bullets title="Advantages" items={focused.benefits} />
            <Bullets title="Trade-offs" items={focused.tradeOffs} />
            <Bullets title="Depends on" items={focused.dependencies} />
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Capabilities it needs</h4>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {[...new Set([...focused.steps.map((s) => (s.actor === 'human' ? 'human-task' : s.capabilityId)), ...focused.supportingCapabilities])].map((c) => {
                const isNew = insights.newResources.includes(capabilityLabel(scenario, c))
                return (
                  <li key={c} className={cn('rounded-full border px-2.5 py-0.5 text-xs', isNew ? 'border-warning/50 bg-warning-soft text-warning-ink' : 'bg-card')}>
                    {capabilityLabel(scenario, c)}
                    {isNew && ' · new worker needed'}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
      <ResourceDetailSheet resource={resource} onOpenChange={(open) => !open && setResource(null)} />
    </StageFrame>
  )
}
