import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Pencil } from 'lucide-react'
import type { DomainId } from '@/app/registry/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { scenarioForDomain, studioScenarios } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { EditableList } from '../components/EditableList'
import { StageFrame } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { interpret, MIN_PROMPT_LENGTH, suggestDomain } from '../services/intelligence'
import type { InterpretationItem } from '../types'
import { useStudio } from '../use-studio'

const domains: { id: DomainId; label: string; note: string }[] = [
  { id: 'insurance', label: 'Insurance', note: 'Domain pack draft available' },
  { id: 'healthcare', label: 'Healthcare', note: 'Domain pack planned' },
  { id: 'banking', label: 'Banking', note: 'Domain pack planned' },
]

const thinkingSteps = (domain: DomainId) => [
  'Reading your description',
  `Matching ${domains.find((d) => d.id === domain)?.label} vocabulary and processes`,
  'Drafting what I understood',
]

function DescribeForm({ initialPrompt, initialDomain, onCancel }: { initialPrompt: string; initialDomain: DomainId | null; onCancel?: () => void }) {
  const { project, dispatch } = useStudio()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [chosen, setChosen] = useState<DomainId | null>(initialDomain)
  const [error, setError] = useState<string | null>(null)
  const sim = useSimulation(700)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), [])

  const suggested = suggestDomain(prompt)
  const domain = chosen ?? suggested ?? 'insurance'

  const start = () => {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      setError(`Describe the problem in a sentence or two (at least ${MIN_PROMPT_LENGTH} characters) so the OS has enough to work with.`)
      return
    }
    setError(null)
    const scenario = scenarioForDomain(domain)
    const steps = thinkingSteps(domain)
    sim.run(steps.length, () => {
      const interpretation = interpret(prompt, scenario)
      if (project) {
        dispatch({ type: 'discover/reinterpret', prompt: prompt.trim(), domain, scenarioId: scenario.id, interpretation })
      } else {
        dispatch({
          type: 'project/create',
          prompt: prompt.trim(),
          domain,
          scenarioId: scenario.id,
          name: scenario.defaultName,
          interpretation,
          now: new Date().toISOString(),
        })
      }
      onCancel?.()
    })
  }

  if (sim.running) {
    return (
      <div className="rounded-xl border bg-card p-6" aria-busy>
        <p className="mb-4 text-sm font-medium">Understanding your request…</p>
        <StepList label="Discovery progress" steps={thinkingSteps(domain)} current={sim.step} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="studio-prompt" className="mb-2 block text-sm font-medium">
          What should the application help your teams achieve?
        </label>
        <Textarea
          id="studio-prompt"
          ref={inputRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'studio-prompt-error' : 'studio-prompt-hint'}
          placeholder="Describe the business problem, who is involved and what a good outcome looks like…"
          className="min-h-36 text-base md:text-base"
        />
        {error ? (
          <p id="studio-prompt-error" className="mt-1.5 text-sm text-danger-ink">
            {error}
          </p>
        ) : (
          <p id="studio-prompt-hint" className="mt-1.5 text-xs text-muted-foreground">
            Plain language is best. You do not need to mention agents, workflows or systems.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Domain</legend>
        <div role="radiogroup" aria-label="Domain" className="flex flex-wrap gap-2">
          {domains.map((d) => {
            const selected = d.id === domain
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosen(d.id)}
                className={cn(
                  'flex min-w-40 flex-col rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected ? 'border-primary/50 bg-accent' : 'bg-card hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {d.label}
                  {suggested === d.id && <span className="rounded-full bg-info-soft px-1.5 text-[11px] font-medium text-info-ink">Suggested</span>}
                </span>
                <span className="text-xs text-muted-foreground">{d.note}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <section aria-label="Example business problems">
        <h3 className="mb-2 text-sm font-medium">Or start from an example</h3>
        <ul className="space-y-1.5">
          {studioScenarios.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setPrompt(s.examplePrompt)
                  setChosen(s.domain)
                  setError(null)
                }}
                className="w-full rounded-lg border bg-card px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="mr-2 text-xs font-medium text-muted-foreground">{s.label}</span>
                {s.examplePrompt}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={start}>
          Start discovery
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}

export function DiscoverStage() {
  const { project, dispatch } = useStudio()
  const [editingPrompt, setEditingPrompt] = useState(false)
  const interpretation = project?.discover.interpretation

  if (!project || !interpretation || editingPrompt) {
    return (
      <StageFrame stage="discover">
        <DescribeForm
          initialPrompt={project?.discover.prompt ?? ''}
          initialDomain={project?.discover.domain ?? null}
          onCancel={editingPrompt ? () => setEditingPrompt(false) : undefined}
        />
      </StageFrame>
    )
  }

  const domainLabel = domains.find((d) => d.id === project.discover.domain)?.label
  const toItems = (list: InterpretationItem[]) => list.map((i) => ({ id: i.id, label: i.text }))
  const fromItems = (items: { id: string; label: string }[]): InterpretationItem[] =>
    items.map((item) => {
      const existing = interpretation.find((i) => i.id === item.id)
      return existing ? { ...existing, text: item.label } : { id: item.id, text: item.label, capabilityIds: [], source: 'user' }
    })

  return (
    <StageFrame
      stage="discover"
      footer={
        <>
          {interpretation.length === 0 && <span className="mr-auto text-sm text-danger-ink">Add at least one point before continuing.</span>}
          <Button disabled={interpretation.length === 0} onClick={() => dispatch({ type: 'discover/confirm' })}>
            {project.progress.discover === 'complete' ? 'Update requirements' : 'Looks right — define requirements'}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border bg-muted/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Your description · {domainLabel}</p>
              <p className="mt-1 text-sm">“{project.discover.prompt}”</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(true)}>
              <Pencil />
              Edit description
            </Button>
          </div>
        </section>

        <EditableList
          title="What I understood"
          items={toItems(interpretation)}
          onChange={(items) => dispatch({ type: 'discover/edit', interpretation: fromItems(items) })}
          addLabel="Add something I missed"
          idPrefix="int"
          emptyText="Nothing left in the interpretation. Add the points that matter."
        />
        <p className="text-xs text-muted-foreground">
          Points you add are kept as requirements. If no existing capability matches them, validation will say so rather than guess.
        </p>
      </div>
    </StageFrame>
  )
}
