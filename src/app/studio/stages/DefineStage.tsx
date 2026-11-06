import { useState } from 'react'
import { ArrowRight, Blocks, ChevronDown, FileInput, FileOutput, Flag, History, Lightbulb, Plug, Puzzle, Route, Scale, Target, UserCheck, Users, type LucideIcon } from 'lucide-react'
import type { RequirementSpec, SpecItem } from '@/app/blueprint/types'
import { explainRequirement } from '@/app/services/mock/architecture-service'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { platformResources } from '@/data/resources.mock'
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { EditableList } from '../components/EditableList'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { ctaClass, IconTile } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import { useStudio } from '../use-studio'

type ContextList = 'processes' | 'challenges' | 'integrations'
const contextSections: { key: ContextList; title: string; add: string; icon: LucideIcon }[] = [
  { key: 'processes', title: 'Business processes', add: 'Add a process', icon: Route },
  { key: 'challenges', title: 'Existing challenges', add: 'Add a challenge', icon: Flag },
  { key: 'integrations', title: 'Potential integrations', add: 'Add an integration', icon: Plug },
]

const designSteps = ['Decomposing the business process', 'Checking the capability catalogue', 'Drafting alternative approaches']

/** Animated link between the inputs, the application and the outputs. */
function FlowLink() {
  return (
    <svg aria-hidden viewBox="0 0 48 12" className="hidden h-3 w-12 shrink-0 self-center @4xl:block">
      <path d="M0 6h40" className="studio-flow fill-none stroke-primary/60" strokeWidth="1.5" />
      <path d="m38 2 5 4-5 4" className="fill-none stroke-primary/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DefineStage({ openArchitect }: { openArchitect: () => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(650)
  const [showContext, setShowContext] = useState(false)

  if (!project?.requirements) {
    return <StagePrerequisite stage="define" requires="discover" message="Confirm what the OS found in your description first." />
  }

  const spec = project.requirements
  const context = spec.context ?? { problem: '', processes: [], challenges: [], integrations: [] }
  const update = (next: RequirementSpec) => dispatch({ type: 'define/update', requirements: next })
  const ask = (item: SpecItem) => {
    const reply = explainRequirement(item.label, item.description)
    dispatch({ type: 'architect/message', message: { role: 'user', stage: 'define', text: `Why “${item.label}”?` } })
    dispatch({ type: 'architect/message', message: { role: 'architect', stage: 'define', text: reply.text, sources: reply.sources } })
    openArchitect()
  }
  const pendingSuggestions = project.discover.understanding?.suggestions.filter((s) => s.status === 'pending').length ?? 0
  const approver = spec.approverRole ? spec.users.find((u) => u.id === spec.approverRole)?.label : null
  const scenario = getScenario(project.scenarioId)
  const inDomain = platformResources.filter((r) => r.domains === 'all' || (project.discover.domain && r.domains.includes(project.discover.domain))).length

  const confirm = () => sim.run(designSteps.length, () => dispatch({ type: 'define/confirm', now: new Date().toISOString() }))

  return (
    <StageFrame
      stage="define"
      thinking={
        sim.running
          ? {
              title: 'Designing approaches…',
              label: 'Designing approaches',
              steps: designSteps,
              current: sim.step,
              results: [`${spec.capabilities.length} capabilities`, `${inDomain} resources in domain`, scenario ? `${scenario.options.length} approaches` : undefined],
            }
          : null
      }
      footer={
        <Button className={ctaClass} onClick={confirm} disabled={spec.capabilities.length === 0 || sim.running}>
          {project.progress.define === 'complete' ? 'Confirmed — view approaches' : 'Confirm requirements'}
          <ArrowRight />
        </Button>
      }
    >
      <div className="grid gap-3 @4xl:grid-cols-6">
        <section aria-label="Business objective" className="rounded-[24px] border border-primary/15 bg-accent/70 p-4 @4xl:col-span-4">
          <label htmlFor="spec-objective" className="mb-1.5 flex items-center gap-2 text-xs font-medium text-accent-foreground">
            <Target aria-hidden className="size-3.5" />
            Business objective
          </label>
          <Textarea
            id="spec-objective"
            defaultValue={spec.objective}
            key={`obj-${spec.version}`}
            onBlur={(e) => e.target.value.trim() !== spec.objective && update({ ...spec, objective: e.target.value.trim() })}
            className="min-h-[5.25rem] resize-none border-0 bg-transparent p-0 text-lg leading-snug font-semibold text-foreground shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent"
          />
        </section>
        <section aria-label="Problem statement" className="studio-card rounded-[24px] p-4 @4xl:col-span-2">
          <label htmlFor="spec-problem" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Problem statement
          </label>
          <Textarea
            id="spec-problem"
            defaultValue={context.problem}
            key={`prob-${spec.version}`}
            onBlur={(e) => e.target.value.trim() !== context.problem && update({ ...spec, context: { ...context, problem: e.target.value.trim() } })}
            className="min-h-14 resize-none border-0 bg-transparent p-0 text-[13px] leading-snug shadow-none focus-visible:ring-0 md:text-[13px] dark:bg-transparent"
          />
        </section>

        {(pendingSuggestions > 0 || approver) && (
          <div className="flex flex-wrap items-center gap-2 @4xl:col-span-6">
            {approver && (
              <p className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[13px]">
                <UserCheck aria-hidden className="size-3.5 text-muted-foreground" />
                <span>
                  Approver for decisions with several candidates: <span className="font-semibold">{approver}</span>
                </span>
              </p>
            )}
            {pendingSuggestions > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'stage/go', stage: 'discover' })}
                className="flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-[13px] font-medium text-info-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Lightbulb aria-hidden className="size-3.5" />
                {pendingSuggestions} suggestion{pendingSuggestions === 1 ? '' : 's'} to review
                <ArrowRight aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 @4xl:col-span-6 @4xl:flex-row">
          <EditableList className="flex-1" icon={FileInput} title="Inputs" items={spec.inputs} onChange={(items) => update({ ...spec, inputs: items })} onAsk={ask} addLabel="Add an input" idPrefix="inputs" emptyText="What information comes in?" />
          <FlowLink />
          <div className="studio-card flex items-center justify-center gap-2.5 rounded-[24px] px-4 py-3 @4xl:w-36 @4xl:flex-col @4xl:text-center">
            <span className="relative flex">
              <span aria-hidden className="studio-pulse absolute inset-0 rounded-[15px] bg-primary/30" />
              <IconTile icon={Blocks} size="lg" />
            </span>
            <p className="line-clamp-3 text-xs leading-tight font-semibold">{project.name}</p>
          </div>
          <FlowLink />
          <EditableList className="flex-1" icon={FileOutput} title="Outputs" items={spec.outputs} onChange={(items) => update({ ...spec, outputs: items })} onAsk={ask} addLabel="Add an output" idPrefix="outputs" emptyText="What does the application produce?" />
        </div>

        <EditableList className="@4xl:col-span-2" avatars icon={Users} title="Users" items={spec.users} onChange={(items) => update({ ...spec, users: items })} onAsk={ask} addLabel="Add a user group" idPrefix="users" emptyText="Who will use the application?" />
        <EditableList className="@4xl:col-span-4" icon={Puzzle} title="Business capabilities" items={spec.capabilities} onChange={(items) => update({ ...spec, capabilities: items })} onAsk={ask} addLabel="Add a capability" idPrefix="capabilities" emptyText="What must the application be able to do?" />
        <EditableList className="@4xl:col-span-3" icon={Scale} title="Constraints" items={spec.constraints} onChange={(items) => update({ ...spec, constraints: items })} onAsk={ask} addLabel="Add a constraint" idPrefix="constraints" emptyText="Security, compliance or operational limits." />
        <EditableList className="@4xl:col-span-3" icon={Flag} title="Success criteria" items={spec.successCriteria} onChange={(items) => update({ ...spec, successCriteria: items })} onAsk={ask} addLabel="Add a success criterion" idPrefix="successCriteria" emptyText="How will you know it works?" />

        <section aria-label="Business context" className="@4xl:col-span-6">
          <button
            type="button"
            aria-expanded={showContext}
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <History aria-hidden className="size-3.5" />
            Business context
            <span className="tabular-nums">{context.processes.length + context.challenges.length + context.integrations.length}</span>
            <ChevronDown aria-hidden className={cn('size-4 transition-transform', showContext && 'rotate-180')} />
          </button>
          {showContext && (
            <div className="mt-2 grid gap-3 @4xl:grid-cols-3">
              {contextSections.map((c) => (
                <EditableList key={c.key} icon={c.icon} title={c.title} items={context[c.key]} onChange={(items) => update({ ...spec, context: { ...context, [c.key]: items } })} addLabel={c.add} idPrefix={c.key} emptyText="None recorded." />
              ))}
            </div>
          )}
        </section>
      </div>
    </StageFrame>
  )
}
