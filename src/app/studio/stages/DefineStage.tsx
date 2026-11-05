import { useState } from 'react'
import { ArrowRight, Lightbulb, Plus } from 'lucide-react'
import type { RequirementSpec, SpecItem } from '@/app/blueprint/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getScenario } from '@/data/studio-scenarios.mock'
import { EditableList } from '../components/EditableList'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { explainRequirement } from '../services/guidance'
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

const designSteps = ['Decomposing the business process', 'Checking the capability catalogue', 'Drafting alternative approaches']

export function DefineStage({ openArchitect }: { openArchitect: () => void }) {
  const { project, dispatch } = useStudio()
  const [dismissed, setDismissed] = useState<string[]>([])
  const sim = useSimulation(650)

  if (!project?.requirements) {
    return <StagePrerequisite stage="define" requires="discover" message="Confirm what the OS understood from your description first. The requirements are drafted from it." />
  }

  const spec = project.requirements
  const scenario = getScenario(project.scenarioId)
  const update = (next: RequirementSpec) => dispatch({ type: 'define/update', requirements: next })
  const ask = (item: SpecItem) => {
    dispatch({ type: 'architect/message', message: { role: 'user', stage: 'define', text: `Why “${item.label}”?` } })
    dispatch({ type: 'architect/message', message: { role: 'architect', stage: 'define', text: explainRequirement(item.label, item.description) } })
    openArchitect()
  }
  const suggestions = (scenario?.suggestions ?? []).filter((s) => !dismissed.includes(s.id) && !spec[s.list].some((i) => i.id === s.item.id))

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
        <section aria-label="Business objective">
          <label htmlFor="spec-objective" className="mb-2 block text-sm font-semibold">
            Business objective
          </label>
          <Textarea
            id="spec-objective"
            defaultValue={spec.objective}
            key={spec.version}
            onBlur={(e) => e.target.value.trim() !== spec.objective && update({ ...spec, objective: e.target.value.trim() })}
            className="min-h-20"
          />
        </section>

        {suggestions.length > 0 && (
          <section aria-label="Suggestions from the architect" className="rounded-lg border border-info/30 bg-info-soft/50 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-info-ink">
              <Lightbulb aria-hidden className="size-4" />
              The architect suggests
            </h3>
            <ul className="mt-2 space-y-2">
              {suggestions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-start gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.item.label}</p>
                    <p className="text-muted-foreground">{s.reason}</p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => update({ ...spec, [s.list]: [...spec[s.list], s.item] })}>
                    <Plus />
                    Add
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setDismissed((d) => [...d, s.id])}>
                    Not needed
                  </Button>
                </li>
              ))}
            </ul>
          </section>
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
      </div>
    </StageFrame>
  )
}
