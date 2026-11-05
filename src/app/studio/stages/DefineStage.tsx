import { ArrowRight, Lightbulb } from 'lucide-react'
import type { RequirementSpec, SpecItem } from '@/app/blueprint/types'
import { explainRequirement } from '@/app/services/mock/architecture-service'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EditableList } from '../components/EditableList'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import type { SpecListKey } from '../types'
import { useStudio } from '../use-studio'

const sections: { key: SpecListKey; title: string; add: string; empty: string }[] = [
  { key: 'users', title: 'Users', add: 'Add a user group', empty: 'Who will use the application?' },
  { key: 'capabilities', title: 'Business capabilities', add: 'Add a capability', empty: 'What must the application be able to do?' },
  { key: 'inputs', title: 'Inputs', add: 'Add an input', empty: 'What information comes in?' },
  { key: 'outputs', title: 'Outputs', add: 'Add an output', empty: 'What does the application produce?' },
  { key: 'constraints', title: 'Constraints', add: 'Add a constraint', empty: 'Security, compliance or operational limits.' },
  { key: 'successCriteria', title: 'Success criteria', add: 'Add a success criterion', empty: 'How will you know it works? Numbers are optional.' },
]

type ContextList = 'processes' | 'challenges' | 'integrations'
const contextSections: { key: ContextList; title: string; add: string }[] = [
  { key: 'processes', title: 'Business processes', add: 'Add a process' },
  { key: 'challenges', title: 'Existing challenges', add: 'Add a challenge' },
  { key: 'integrations', title: 'Potential integrations', add: 'Add an integration' },
]

const designSteps = ['Decomposing the business process', 'Checking the capability catalogue', 'Drafting alternative approaches']

export function DefineStage({ openArchitect }: { openArchitect: () => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(650)

  if (!project?.requirements) {
    return <StagePrerequisite stage="define" requires="discover" message="Confirm what the OS understood from your description first. The requirements are drafted from it." />
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

  const confirm = () => sim.run(designSteps.length, () => dispatch({ type: 'define/confirm', now: new Date().toISOString() }))

  return (
    <StageFrame
      stage="define"
      aside={<span className="text-xs text-muted-foreground tabular-nums">Specification v{spec.version}</span>}
      footer={
        sim.running ? (
          <div className="mr-auto">
            <StepList label="Designing approaches" steps={designSteps} current={sim.step} />
          </div>
        ) : (
          <Button onClick={confirm} disabled={spec.capabilities.length === 0}>
            {project.progress.define === 'complete' ? 'Confirmed — view approaches' : 'Confirm requirements'}
            <ArrowRight />
          </Button>
        )
      }
    >
      <div className="space-y-8">
        <div className="grid gap-6 @4xl:grid-cols-2">
          <section aria-label="Business objective">
            <label htmlFor="spec-objective" className="mb-2 block text-sm font-semibold">
              Business objective
            </label>
            <Textarea
              id="spec-objective"
              defaultValue={spec.objective}
              key={`obj-${spec.version}`}
              onBlur={(e) => e.target.value.trim() !== spec.objective && update({ ...spec, objective: e.target.value.trim() })}
              className="min-h-20"
            />
          </section>
          <section aria-label="Problem statement">
            <label htmlFor="spec-problem" className="mb-2 block text-sm font-semibold">
              Problem statement
            </label>
            <Textarea
              id="spec-problem"
              defaultValue={context.problem}
              key={`prob-${spec.version}`}
              onBlur={(e) => e.target.value.trim() !== context.problem && update({ ...spec, context: { ...context, problem: e.target.value.trim() } })}
              className="min-h-20"
            />
          </section>
        </div>

        {(pendingSuggestions > 0 || approver) && (
          <div className="flex flex-wrap gap-3 text-sm">
            {approver && (
              <p className="rounded-lg border bg-muted/40 px-3 py-2">
                Approver for decisions with several candidates: <span className="font-medium">{approver}</span> (your answer in Discover)
              </p>
            )}
            {pendingSuggestions > 0 && (
              <p className="flex items-center gap-2 rounded-lg border border-info/30 bg-info-soft/50 px-3 py-2 text-info-ink">
                <Lightbulb aria-hidden className="size-4" />
                {pendingSuggestions} suggestion{pendingSuggestions === 1 ? '' : 's'} not yet reviewed
                <Button size="xs" variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: 'discover' })}>
                  Review in Discover
                </Button>
              </p>
            )}
          </div>
        )}

        <div className="grid gap-8 @4xl:grid-cols-2">
          {sections.map((section) => (
            <EditableList
              key={section.key}
              title={section.title}
              items={spec[section.key]}
              onChange={(items) => update({ ...spec, [section.key]: items })}
              onAsk={ask}
              addLabel={section.add}
              idPrefix={section.key}
              emptyText={section.empty}
            />
          ))}
        </div>

        <section aria-label="Business context" className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-sm font-semibold">Business context</h3>
            <p className="text-sm text-muted-foreground">Captured in Discover. Used to explain the application, not to generate steps.</p>
          </div>
          <div className="grid gap-8 @4xl:grid-cols-3">
            {contextSections.map((c) => (
              <EditableList
                key={c.key}
                title={c.title}
                items={context[c.key]}
                onChange={(items) => update({ ...spec, context: { ...context, [c.key]: items } })}
                addLabel={c.add}
                idPrefix={c.key}
                emptyText="None recorded."
              />
            ))}
          </div>
        </section>
      </div>
    </StageFrame>
  )
}
