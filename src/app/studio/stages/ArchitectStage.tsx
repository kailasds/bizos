import { useCallback, useState, type ReactNode } from 'react'
import { ArrowRight, Bot, Check, ChevronDown, CircleMinus, CirclePlus, Link2, Settings2, Star, User, UserCheck } from 'lucide-react'
import type { AutomationLevel, SolutionOption } from '@/app/blueprint/types'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { approachInsights, type StepInsight } from '@/app/services/mock/architecture-service'
import { capabilityLabel } from '@/app/services/mock/capability-analysis-service'
import { InfoTip } from '@/components/os/InfoTip'
import { Button } from '@/components/ui/button'
import { platformResources, resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { ApproachFlow } from '../components/ApproachFlow'
import { actorMeta } from '../components/actor-meta'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { ActorBar, ctaClass, SectionLabel } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import type { StudioScenario } from '../types'
import { useStudio } from '../use-studio'

const automationMeta: Record<AutomationLevel, { label: string; level: number }> = {
  assisted: { label: 'Assisted', level: 1 },
  balanced: { label: 'Balanced', level: 2 },
  extensive: { label: 'Extensive', level: 3 },
}

/** Qualitative automation level — deliberately not a percentage. */
function AutomationDial({ level }: { level: AutomationLevel }) {
  const meta = automationMeta[level]
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span aria-hidden className="flex items-end gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('w-1.5 rounded-sm', n <= meta.level ? 'bg-actor-ai' : 'bg-studio-ink/10')} style={{ height: 4 + n * 3 }} />
        ))}
      </span>
      {meta.label} automation
    </span>
  )
}

const stepCounts = (o: SolutionOption) => ({
  people: o.steps.filter((s) => s.actor === 'human').length,
  ai: o.steps.filter((s) => s.actor === 'automated').length,
  system: o.steps.filter((s) => s.actor === 'system').length,
})

function ActorCounts({ option }: { option: SolutionOption }) {
  const c = stepCounts(option)
  return (
    <span className="flex items-center gap-2.5 text-[11px] font-medium text-muted-foreground tabular-nums">
      <span title="People" className="flex items-center gap-1">
        <User aria-hidden className="size-3" /> {c.people}
      </span>
      <span title="AI and automation" className="flex items-center gap-1">
        <Bot aria-hidden className="size-3" /> {c.ai}
      </span>
      <span title="Rules and systems" className="flex items-center gap-1">
        <Settings2 aria-hidden className="size-3" /> {c.system}
      </span>
    </span>
  )
}

function Bullets({ title, items, icon, tone }: { title: string; items: string[]; icon: ReactNode; tone?: string }) {
  return (
    <div className="studio-card rounded-[20px] p-3.5">
      <SectionLabel className={cn('mb-2 flex items-center gap-1.5', tone)}>
        {icon}
        {title}
      </SectionLabel>
      <ul className="space-y-1.5 text-[13px] leading-snug">
        {items.map((item) => (
          <li key={item}>{item}</li>
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
  const meta = actorMeta[step.actor]
  const Icon = meta.icon
  const chips = (list: string[] | undefined, none: string) =>
    list?.length ? (
      <span className="flex flex-wrap gap-1">
        {list.map((id) => (
          <span key={id} className="rounded-md bg-muted px-1.5 text-[11px] leading-5 font-medium">
            {field(id)}
          </span>
        ))}
      </span>
    ) : (
      <span className="text-[13px] text-muted-foreground">{none}</span>
    )
  return (
    <section aria-label={`Step details: ${step.name}`} className="studio-card flex flex-wrap items-stretch gap-x-3 gap-y-2 rounded-[20px] p-3">
      <div className="flex min-w-48 flex-1 items-center gap-2.5">
        <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', meta.tile)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h4 className="text-[13px] leading-tight font-semibold">{step.name}</h4>
          <p className="text-[11px] leading-tight text-muted-foreground">{capabilityLabel(scenario, step.capabilityId)}</p>
        </div>
      </div>
      <div className="min-w-44 flex-1">
        <p className="text-[11px] text-muted-foreground">{step.actor === 'human' ? 'Decided by' : 'Done by'}</p>
        <p className="text-[13px] leading-snug font-medium">
          {step.actor === 'human' ? (
            step.role ? (
              roleLabel(step.role)
            ) : (
              `To be decided: ${(step.roleCandidates ?? []).map(roleLabel).join(' or ')}`
            )
          ) : resource ? (
            <button type="button" aria-label={`About ${resource.name}`} onClick={() => onOpenResource(resource)} className="text-left underline decoration-studio-ink/25 underline-offset-2 outline-none hover:decoration-studio-ink focus-visible:ring-3 focus-visible:ring-ring/50">
              {resource.name} ({resourceKindLabel[resource.kind]})
            </button>
          ) : (
            'No existing resource — a new worker would be needed'
          )}
        </p>
      </div>
      <div className="min-w-40 flex-1">
        <p className="mb-0.5 text-[11px] text-muted-foreground">Uses</p>
        {chips(contract?.inputs, 'Starts the case')}
      </div>
      <div className="min-w-40 flex-1">
        <p className="mb-0.5 text-[11px] text-muted-foreground">Produces</p>
        {chips(contract?.outputs, 'An update for people')}
      </div>
    </section>
  )
}

function CompareTable({ options, scenario, selectedId, onFocus }: { options: SolutionOption[]; scenario: StudioScenario; selectedId: string | null; onFocus: (id: string) => void }) {
  const rows: { label: string; render: (o: SolutionOption) => ReactNode }[] = [
    {
      label: 'Who does the work',
      render: (o) => {
        const c = stepCounts(o)
        return (
          <span className="block w-44 space-y-1.5">
            <ActorBar {...c} />
            <ActorCounts option={o} />
          </span>
        )
      },
    },
    {
      label: 'Human involvement',
      render: (o) => (
        <span className="font-semibold tabular-nums" title={o.steps.filter((s) => s.actor === 'human').map((s) => s.name).join(', ')}>
          {o.steps.filter((s) => s.actor === 'human').length} of {o.steps.length} steps
        </span>
      ),
    },
    { label: 'Automation', render: (o) => <AutomationDial level={o.automation} /> },
    {
      label: 'New resources needed',
      render: (o) => {
        const n = approachInsights(scenario, o).newResources
        return n.length ? (
          <span className="flex flex-wrap gap-1">
            {n.map((x) => (
              <span key={x} className="rounded-md bg-warning-soft px-1.5 text-[11px] leading-5 font-medium text-warning-ink">
                {x}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )
      },
    },
    { label: 'Advantages', render: (o) => <span className="text-[13px] leading-snug">{o.benefits.join(' · ')}</span> },
    { label: 'Trade-offs', render: (o) => <span className="text-[13px] leading-snug">{o.tradeOffs.join(' · ')}</span> },
  ]
  return (
    <div className="studio-card overflow-x-auto rounded-[24px]">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Comparison of solution approaches</caption>
        <thead className="text-left">
          <tr className="border-b">
            <th className="w-36 px-4 py-3" />
            {options.map((o) => (
              <th key={o.id} scope="col" className="px-3 py-3 align-top">
                <button type="button" onClick={() => onFocus(o.id)} className="text-left font-semibold outline-none hover:underline focus-visible:underline">
                  {o.name}
                </button>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs font-medium">
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
              <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {row.label}
              </th>
              {options.map((o) => (
                <td key={o.id} className="px-3 py-3">
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
  const [showMore, setShowMore] = useState(false)
  const requirements = project?.requirements
  const roleLabel = useCallback((id: string) => requirements?.users.find((u) => u.id === id)?.label ?? id, [requirements])

  if (!project?.architecture) {
    return <StagePrerequisite stage="architect" requires="define" message="Confirm the requirements first. Approaches are designed to answer them." />
  }
  const scenario = getScenario(project.scenarioId)
  if (!scenario) return null

  const { options, selectedOptionId } = project.architecture
  const selected = options.find((o) => o.id === selectedOptionId)
  const focused = options.find((o) => o.id === focusId) ?? selected ?? options.find((o) => o.recommended) ?? options[0]
  const insights = approachInsights(scenario, focused)
  const inspected = insights.steps.find((s) => s.step.id === stepId) ?? insights.steps.find((s) => s.step.actor === 'human') ?? insights.steps[0]

  const focus = (id: string) => {
    onFocus(id)
    setStepId(null)
    setView('explore')
  }

  const inDomain = platformResources.filter((r) => r.domains === 'all' || (project.discover.domain && r.domains.includes(project.discover.domain)))
  const ownerCount = (owner: string) => inDomain.filter((r) => r.owner === owner).length

  return (
    <StageFrame
      stage="architect"
      thinking={
        sim.running
          ? {
              title: 'Finding resources…',
              label: 'Discovering resources',
              steps: discoverySteps,
              current: sim.step,
              results: [`${ownerCount('Agent Control Plane')} agents`, `${ownerCount('AI Workers Platform')} workers`, `${inDomain.length} in domain`, undefined],
            }
          : null
      }
      aside={
        <div role="group" aria-label="View" className="liquid-glass flex gap-0.5 rounded-full p-0.5">
          {(
            [
              ['explore', 'Explore'],
              ['compare', 'Compare all'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn('h-7 rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50', view === id ? 'bg-studio-ink text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          {!selected && <span className="text-muted-foreground">Select an approach to continue.</span>}
          <Button className={ctaClass} disabled={!selected || sim.running} onClick={() => sim.run(discoverySteps.length, () => dispatch({ type: 'architect/confirm' }))}>
            {selected ? `Use ${selected.name} — find resources` : 'Find resources'}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div role="tablist" aria-label="Solution approaches" className={cn('grid gap-2.5', options.length === 3 ? '@4xl:grid-cols-3' : '@3xl:grid-cols-2')}>
        {options.map((o) => {
          const c = stepCounts(o)
          const isFocused = view === 'explore' && o.id === focused.id
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={isFocused}
              onClick={() => focus(o.id)}
              className={cn('flex flex-col gap-2.5 rounded-[22px] p-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50', isFocused ? 'bg-white shadow-studio ring-2 ring-primary' : 'studio-card hover:bg-white')}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm leading-tight font-semibold">{o.name}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {o.recommended && <Star aria-label="Recommended" className="size-4 fill-actor-person text-actor-person" />}
                  {o.id === selectedOptionId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-1.5 text-[11px] leading-5 font-medium text-success-ink">
                      <Check aria-hidden className="size-3" /> Selected
                    </span>
                  )}
                </span>
              </span>
              <ActorBar {...c} />
              <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <AutomationDial level={o.automation} />
                <ActorCounts option={o} />
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                People on {c.people} of {o.steps.length} steps
              </span>
            </button>
          )
        })}
      </div>

      {view === 'compare' ? (
        <div className="mt-4">
          <CompareTable options={options} scenario={scenario} selectedId={selectedOptionId} onFocus={focus} />
        </div>
      ) : (
        <section role="tabpanel" aria-label={focused.name} className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 basis-64 items-center gap-1">
              <div className="min-w-0">
                <h3 className="text-base leading-tight font-semibold">{focused.name}</h3>
                <p className="truncate text-[13px] text-muted-foreground">{focused.tagline}</p>
              </div>
              <InfoTip label="Operating model">{focused.operatingModel ?? focused.summary}</InfoTip>
              <InfoTip label="How it addresses your problem">{focused.howItAddresses ?? focused.summary}</InfoTip>
              {focused.recommended && (
                <InfoTip label="Why recommended" className="text-actor-person">
                  {focused.recommended.reason}
                </InfoTip>
              )}
            </div>
            {focused.id === selectedOptionId ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-[13px] font-medium text-success-ink">
                <Check aria-hidden className="size-4" /> Selected
              </span>
            ) : (
              <Button className="rounded-full" onClick={() => dispatch({ type: 'architect/select', optionId: focused.id })}>
                Select this approach
              </Button>
            )}
          </div>

          <ApproachFlow key={focused.id} label={`${focused.name} workflow`} steps={focused.steps} insights={insights.steps} roleLabel={roleLabel} selectedStepId={inspected?.step.id} onSelectStep={setStepId} />
          {inspected && <StepInspector insight={inspected} scenario={scenario} roleLabel={roleLabel} onOpenResource={setResource} />}

          <button
            type="button"
            aria-expanded={showMore}
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Trade-offs and dependencies
            <ChevronDown aria-hidden className={cn('size-4 transition-transform', showMore && 'rotate-180')} />
          </button>
          {showMore && (
            <>
              <div className="grid gap-2.5 @3xl:grid-cols-2 @6xl:grid-cols-4">
                <Bullets title="Advantages" items={focused.benefits} tone="text-success-ink" icon={<CirclePlus aria-hidden className="size-3.5" />} />
                <Bullets title="Trade-offs" items={focused.tradeOffs} tone="text-warning-ink" icon={<CircleMinus aria-hidden className="size-3.5" />} />
                <Bullets title="Where people are involved" items={focused.humanReview} icon={<UserCheck aria-hidden className="size-3.5" />} />
                <Bullets title="Depends on" items={focused.dependencies} icon={<Link2 aria-hidden className="size-3.5" />} />
              </div>
              <ul aria-label="Capabilities it needs" className="flex flex-wrap gap-1.5">
                {[...new Set([...focused.steps.map((s) => (s.actor === 'human' ? 'human-task' : s.capabilityId)), ...focused.supportingCapabilities])].map((c) => {
                  const isNew = insights.newResources.includes(capabilityLabel(scenario, c))
                  return (
                    <li key={c} className={cn('rounded-full border px-2.5 py-0.5 text-xs', isNew ? 'border-warning/50 bg-warning-soft text-warning-ink' : 'border-white bg-white/70')}>
                      {capabilityLabel(scenario, c)}
                      {isNew && ' · new worker needed'}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      )}
      <ResourceDetailSheet resource={resource} onOpenChange={(open) => !open && setResource(null)} />
    </StageFrame>
  )
}
