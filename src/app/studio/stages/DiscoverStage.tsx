import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, HelpCircle, Lightbulb, Pencil, Plus, Quote, Trash2, Undo2 } from 'lucide-react'
import type { DomainId } from '@/app/registry/types'
import {
  answerQuestion,
  buildUnderstanding,
  decideSuggestion,
  MIN_PROMPT_LENGTH,
  suggestDomain,
  understandIntent,
} from '@/app/services/mock/intent-service'
import { MockBadge } from '@/components/os/MockBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getScenario, studioScenarios } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { StageFrame } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import type { StudioScenario, Understanding, UnderstandingGroup, UnderstandingItem, UnderstandingKind } from '../types'
import { useStudio } from '../use-studio'

const domains: { id: DomainId; label: string; note: string }[] = [
  { id: 'insurance', label: 'Insurance', note: 'Domain pack draft available' },
  { id: 'healthcare', label: 'Healthcare', note: 'Domain pack planned' },
  { id: 'banking', label: 'Banking', note: 'Domain pack planned' },
]

const understandingSteps = [
  'Identifying the business objective',
  'Finding the people and processes involved',
  'Checking constraints and integrations',
  'Matching the capabilities required',
]

const STEP_MS = 600

// ── Describe ──────────────────────────────────────────────────────────────

interface Unmatched {
  prompt: string
  domain: DomainId
  points: string[]
  closestScenarioId: string | null
}

function DescribeForm({
  initialPrompt,
  initialDomain,
  onCancel,
  onUnmatched,
}: {
  initialPrompt: string
  initialDomain: DomainId | null
  onCancel?: () => void
  onUnmatched: (u: Unmatched) => void
}) {
  const { project, dispatch } = useStudio()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [chosen, setChosen] = useState<DomainId | null>(initialDomain)
  const [error, setError] = useState<string | null>(null)
  const sim = useSimulation(STEP_MS)
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
    const pending = understandIntent({ prompt, domain }, understandingSteps.length * STEP_MS)
    sim.run(understandingSteps.length, async () => {
      const result = await pending
      if (!result.ok) return setError(result.error.message)
      if (result.data.kind === 'unmatched') {
        return onUnmatched({ prompt: prompt.trim(), domain, points: result.data.points, closestScenarioId: result.data.closestScenarioId })
      }
      const scenario = getScenario(result.data.scenarioId)!
      if (project) {
        dispatch({ type: 'discover/reinterpret', prompt: prompt.trim(), domain, scenarioId: scenario.id, understanding: result.data.understanding })
      } else {
        dispatch({
          type: 'project/create',
          prompt: prompt.trim(),
          domain,
          scenarioId: scenario.id,
          name: scenario.defaultName,
          understanding: result.data.understanding,
          now: new Date().toISOString(),
        })
      }
      onCancel?.()
    })
  }

  if (sim.running) {
    return (
      <div className="rounded-xl border bg-card p-6" aria-busy>
        <p className="mb-1 text-sm font-medium">Understanding your request…</p>
        <p className="mb-4 text-xs text-muted-foreground">Simulated: matching your words against scripted scenarios. No AI model is called.</p>
        <StepList label="Discovery progress" steps={understandingSteps} current={sim.step} />
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

// ── Honest fallback for descriptions no scenario matches ───────────────────

function FallbackView({ unmatched, onDone }: { unmatched: Unmatched; onDone: () => void }) {
  const { project, dispatch } = useStudio()
  const ordered = [...studioScenarios].sort((a, b) => (a.id === unmatched.closestScenarioId ? -1 : b.id === unmatched.closestScenarioId ? 1 : 0))

  const startFrom = (scenario: StudioScenario) => {
    const understanding = buildUnderstanding(unmatched.prompt, scenario, unmatched.points)
    if (project) {
      dispatch({ type: 'discover/reinterpret', prompt: unmatched.prompt, domain: scenario.domain, scenarioId: scenario.id, understanding })
    } else {
      dispatch({ type: 'project/create', prompt: unmatched.prompt, domain: scenario.domain, scenarioId: scenario.id, name: scenario.defaultName, understanding, now: new Date().toISOString() })
    }
    onDone()
  }

  return (
    <div className="space-y-6">
      <section role="status" className="rounded-xl border bg-card p-5">
        <h3 className="text-base font-semibold">I don’t have a scripted understanding for this description</h3>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          This prototype’s intelligence is simulated. It recognises three scenarios — insurance claims, healthcare prior authorization and banking SME
          lending — and has not interpreted your text. Rather than guess, it keeps your points exactly as you wrote them.
        </p>
        <h4 className="mt-4 text-xs font-medium text-muted-foreground">Your points, unchanged</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {unmatched.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Templates">
        <h3 className="mb-2 text-sm font-medium">Continue from a template, keeping your points as extra requirements</h3>
        <ul className="space-y-1.5">
          {ordered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => startFrom(s)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {s.label} <span className="font-normal text-muted-foreground">· {domains.find((d) => d.id === s.domain)?.label}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                </span>
                {s.id === unmatched.closestScenarioId && <span className="rounded-full bg-info-soft px-2 text-[11px] leading-5 font-medium text-info-ink">Closest</span>}
                <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Button variant="outline" onClick={onDone}>
        <Pencil />
        Rewrite the description
      </Button>
    </div>
  )
}

// ── Understanding ─────────────────────────────────────────────────────────

const GROUPS: { id: UnderstandingGroup; title: string; kinds: { kind: UnderstandingKind; label: string; add?: string }[] }[] = [
  {
    id: 'objective',
    title: 'Objective and outcomes',
    kinds: [
      { kind: 'objective', label: 'Business objective' },
      { kind: 'problem', label: 'Problem statement' },
      { kind: 'outcome', label: 'Desired outcomes', add: 'Add an outcome' },
    ],
  },
  { id: 'people', title: 'People', kinds: [{ kind: 'user', label: 'Target users', add: 'Add a user group' }] },
  {
    id: 'process',
    title: 'Processes and challenges',
    kinds: [
      { kind: 'process', label: 'Business processes involved', add: 'Add a process' },
      { kind: 'challenge', label: 'Existing challenges', add: 'Add a challenge' },
    ],
  },
  {
    id: 'information',
    title: 'Information and integrations',
    kinds: [
      { kind: 'input', label: 'Information coming in', add: 'Add an input' },
      { kind: 'output', label: 'Information going out', add: 'Add an output' },
      { kind: 'integration', label: 'Potential integrations', add: 'Add an integration' },
    ],
  },
  { id: 'rules', title: 'Constraints', kinds: [{ kind: 'constraint', label: 'Important constraints', add: 'Add a constraint' }] },
  { id: 'capabilities', title: 'Required capabilities', kinds: [{ kind: 'capability', label: 'What the application must do', add: 'Add a capability' }] },
]

function SourceCue({ item, domainLabel }: { item: UnderstandingItem; domainLabel: string }) {
  switch (item.source) {
    case 'description':
      return item.quote ? (
        <>
          <Quote aria-hidden className="size-3 shrink-0" /> From your description: “{item.quote}”
        </>
      ) : (
        <>From your description</>
      )
    case 'domain':
      return <>From the {domainLabel} domain pack</>
    case 'user':
      return <>Added by you</>
    case 'suggestion':
      return <>Suggestion you accepted</>
    case 'answer':
      return <>From your answer</>
  }
}

function ItemRow({
  item,
  domainLabel,
  removable,
  onChange,
  onRemove,
}: {
  item: UnderstandingItem
  domainLabel: string
  removable: boolean
  onChange: (text: string) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  if (editing) {
    return (
      <li className="px-3 py-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) onChange(text.trim())
            setEditing(false)
          }}
        >
          <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label={`Edit: ${item.text}`} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} />
          <Button type="submit" size="sm">
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      </li>
    )
  }
  return (
    <li className="group flex items-start gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm">{item.text}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <SourceCue item={item} domainLabel={domainLabel} />
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-60 group-focus-within:opacity-100 group-hover:opacity-100">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`Edit ${item.text}`}
          onClick={() => {
            setText(item.text)
            setEditing(true)
          }}
        >
          <Pencil />
        </Button>
        {removable && (
          <Button size="icon-xs" variant="ghost" aria-label={`Remove ${item.text}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  )
}

function AddItem({ label, onAdd }: { label: string; onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  if (!open) {
    return (
      <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>
    )
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onAdd(text.trim())
        setText('')
        setOpen(false)
      }}
    >
      <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={label} aria-label={label} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
      <Button type="submit" size="sm" disabled={!text.trim()}>
        Add
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  )
}

function UnderstandingView({ understanding, scenario, domainLabel, onEditPrompt }: { understanding: Understanding; scenario: StudioScenario; domainLabel: string; onEditPrompt: () => void }) {
  const { project, dispatch } = useStudio()
  const update = (u: Understanding) => dispatch({ type: 'discover/update', understanding: u })
  const setItems = (items: UnderstandingItem[]) => update({ ...understanding, items })
  const pendingQuestions = understanding.questions.filter((q) => !q.answer)

  return (
    <div className="space-y-6">
      <section aria-label="Summary of understanding" className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">What I understood</h3>
          <span className="rounded-full border px-2 text-[11px] leading-5 text-muted-foreground">{scenario.label} scenario · scripted</span>
        </div>
        <p className="mt-2 max-w-prose text-base">{understanding.summary}</p>
        {understanding.matchedPhrases.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Based on your words {understanding.matchedPhrases.map((p) => `“${p}”`).join(', ')} and the {domainLabel} domain pack.
          </p>
        )}
        <div className="mt-3 flex items-start gap-3 border-t pt-3">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            Your description: <span className="text-foreground">“{project?.discover.prompt}”</span>
          </p>
          <Button size="xs" variant="ghost" onClick={onEditPrompt}>
            <Pencil />
            Edit description
          </Button>
        </div>
      </section>

      {understanding.questions.length > 0 && (
        <section aria-label="Clarifying questions">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <HelpCircle aria-hidden className="size-4 text-muted-foreground" />
            {pendingQuestions.length ? `${pendingQuestions.length} question${pendingQuestions.length === 1 ? '' : 's'} that would help` : 'Your answers'}
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {understanding.questions.map((q) => {
              const chosen = q.options.find((o) => o.id === q.answer)
              return (
                <li key={q.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{q.text}</p>
                  <p className="text-xs text-muted-foreground">{q.why}</p>
                  {q.answer ? (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      {chosen ? (
                        <>
                          <Check aria-hidden className="size-4 text-success" /> {chosen.label}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Skipped for now</span>
                      )}
                      <Button size="xs" variant="ghost" aria-label={`Change answer: ${q.text}`} onClick={() => update(answerQuestion(understanding, q.id, null))}>
                        Change
                      </Button>
                    </p>
                  ) : (
                    <div role="group" aria-label={q.text} className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <Button key={o.id} size="sm" variant="outline" onClick={() => update(answerQuestion(understanding, q.id, o.id))}>
                          {o.label}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => update(answerQuestion(understanding, q.id, 'skipped'))}>
                        Skip
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Accordion type="multiple" defaultValue={['objective', 'capabilities']} className="rounded-lg border bg-card">
        {GROUPS.map((group) => {
          const items = understanding.items.filter((i) => group.kinds.some((k) => k.kind === i.kind))
          return (
            <AccordionItem key={group.id} value={group.id} className="px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                  <span className="text-sm font-semibold">{group.title}</span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">{items.length}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground @3xl:inline">{items[0]?.text}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {group.kinds.map(({ kind, label, add }) => {
                  const list = understanding.items.filter((i) => i.kind === kind)
                  return (
                    <div key={kind} role="group" aria-label={label}>
                      <h4 className="mb-1 text-xs font-medium text-muted-foreground">{label}</h4>
                      {list.length > 0 && (
                        <ul className="divide-y rounded-lg border">
                          {list.map((item) => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              domainLabel={domainLabel}
                              removable={kind !== 'objective' && kind !== 'problem'}
                              onChange={(text) => setItems(understanding.items.map((i) => (i.id === item.id ? { ...i, text } : i)))}
                              onRemove={() => setItems(understanding.items.filter((i) => i.id !== item.id))}
                            />
                          ))}
                        </ul>
                      )}
                      {add && (
                        <div className="mt-1">
                          <AddItem
                            label={add}
                            onAdd={(text) => {
                              const n = understanding.items.reduce((m, i) => Math.max(m, Number(i.id.match(/^usr-disc-(\d+)/)?.[1] ?? 0)), 0) + 1
                              setItems([...understanding.items, { id: `usr-disc-${n}`, kind, text, source: 'user', capabilityIds: [] }])
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {understanding.suggestions.length > 0 && (
        <section aria-label="Possibly missing">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb aria-hidden className="size-4 text-muted-foreground" />
            Possibly missing
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {understanding.suggestions.map((s) => (
              <li key={s.id} className={cn('flex flex-wrap items-start gap-2 px-4 py-3', s.status !== 'pending' && 'bg-muted/40')}>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', s.status === 'rejected' && 'text-muted-foreground line-through')}>{s.text}</p>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                </div>
                {s.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button size="xs" variant="outline" aria-label={`Accept: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'accepted'))}>
                      <Plus />
                      Accept
                    </Button>
                    <Button size="xs" variant="ghost" aria-label={`Reject: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'rejected'))}>
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {s.status === 'accepted' ? 'Added' : 'Rejected'}
                    <Button size="xs" variant="ghost" aria-label={`Undo: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'pending'))}>
                      <Undo2 />
                      Undo
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <MockBadge label="Simulated understanding" />
    </div>
  )
}

export function DiscoverStage() {
  const { project, dispatch } = useStudio()
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [unmatched, setUnmatched] = useState<Unmatched | null>(null)
  const understanding = project?.discover.understanding
  const scenario = getScenario(project?.scenarioId ?? null)

  if (unmatched) {
    return (
      <StageFrame stage="discover">
        <FallbackView
          unmatched={unmatched}
          onDone={() => {
            setUnmatched(null)
            setEditingPrompt(false)
          }}
        />
      </StageFrame>
    )
  }

  if (!project || !understanding || !scenario || editingPrompt) {
    return (
      <StageFrame stage="discover">
        <DescribeForm
          initialPrompt={project?.discover.prompt ?? ''}
          initialDomain={project?.discover.domain ?? null}
          onCancel={editingPrompt ? () => setEditingPrompt(false) : undefined}
          onUnmatched={setUnmatched}
        />
      </StageFrame>
    )
  }

  const domainLabel = domains.find((d) => d.id === scenario.domain)?.label ?? scenario.domain
  const capabilityCount = understanding.items.filter((i) => i.kind === 'capability').length

  return (
    <StageFrame
      stage="discover"
      footer={
        <>
          {capabilityCount === 0 && <span className="mr-auto text-sm text-danger-ink">Add at least one required capability before continuing.</span>}
          <Button disabled={capabilityCount === 0} onClick={() => dispatch({ type: 'discover/confirm' })}>
            {project.progress.discover === 'complete' ? 'Update requirements' : 'Confirm understanding — draft requirements'}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <UnderstandingView understanding={understanding} scenario={scenario} domainLabel={domainLabel} onEditPrompt={() => setEditingPrompt(true)} />
    </StageFrame>
  )
}
