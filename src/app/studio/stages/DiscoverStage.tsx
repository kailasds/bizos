import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, CornerDownRight, Database, FileText, HeartPulse, Landmark, Pencil, Plus, Puzzle, Quote, Scale, ShieldCheck, Sparkles, Target, Trash2, Undo2, Users, Workflow, X, type LucideIcon } from 'lucide-react'
import { InfoTip } from '@/components/os/InfoTip'
import type { DomainId } from '@/app/registry/types'
import {
  answerQuestion,
  buildUnderstanding,
  decideSuggestion,
  MIN_PROMPT_LENGTH,
  suggestDomain,
  understandIntent,
} from '@/app/services/mock/intent-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getScenario, studioScenarios } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { StageFrame } from '../components/StageFrame'
import { ctaClass, IconTile, SectionLabel, type ThinkingProps } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import type { StudioScenario, Understanding, UnderstandingGroup, UnderstandingItem, UnderstandingKind } from '../types'
import { useStudio } from '../use-studio'

const domains: { id: DomainId; label: string; note: string; icon: LucideIcon }[] = [
  { id: 'insurance', label: 'Insurance', note: 'Domain pack draft available', icon: ShieldCheck },
  { id: 'healthcare', label: 'Healthcare', note: 'Domain pack planned', icon: HeartPulse },
  { id: 'banking', label: 'Banking', note: 'Domain pack planned', icon: Landmark },
]
const domainMeta = (id: DomainId) => domains.find((d) => d.id === id)!

const understandingSteps = ['Identifying the business objective', 'Finding the people and processes involved', 'Checking constraints and integrations', 'Matching the capabilities required']

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
  onThinking,
}: {
  initialPrompt: string
  initialDomain: DomainId | null
  onCancel?: () => void
  onUnmatched: (u: Unmatched) => void
  onThinking: (t: ThinkingProps | null) => void
}) {
  const { project, dispatch } = useStudio()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [chosen, setChosen] = useState<DomainId | null>(initialDomain)
  const [error, setError] = useState<string | null>(null)
  const sim = useSimulation(STEP_MS)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), [])

  const suggested = suggestDomain(prompt)
  const domain = chosen ?? suggested ?? 'insurance'

  useEffect(() => {
    onThinking(sim.running ? { title: 'Understanding your request…', label: 'Discovery progress', steps: understandingSteps, current: sim.step } : null)
  }, [sim.running, sim.step, onThinking])

  const start = () => {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      setError(`Add a little more detail — at least ${MIN_PROMPT_LENGTH} characters.`)
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

  return (
    <div className="flex flex-1 flex-col items-stretch px-[var(--center-gutter)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-between gap-8 pt-2 @3xl:pt-[5vh]">
      <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center">
        <IconTile icon={Sparkles} size="xl" tone="primary" className="mb-5" />
        <p className="text-2xl font-semibold tracking-tight text-muted-foreground/70 @3xl:text-3xl">Describe a business problem.</p>
        <p className="text-primary text-2xl leading-tight font-bold tracking-tight @3xl:text-4xl">Get a working application.</p>
      </motion.div>

      <div className="w-full space-y-4">
        <section aria-label="Example business problems">
          <ul className="grid gap-3 @2xl:grid-cols-3">
            {studioScenarios.map((s, i) => {
              const meta = domainMeta(s.domain)
              return (
                <motion.li key={s.id} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}>
                  <button
                    type="button"
                    aria-label={`${s.label}: ${s.examplePrompt}`}
                    aria-pressed={prompt === s.examplePrompt}
                    title={s.examplePrompt}
                    onClick={() => {
                      setPrompt(s.examplePrompt)
                      setChosen(s.domain)
                      setError(null)
                      inputRef.current?.focus({ preventScroll: true })
                    }}
                    className={cn(
                      'studio-card flex h-full w-full flex-col gap-3 rounded-[22px] p-4 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
                      prompt === s.examplePrompt && 'ring-2 ring-primary',
                    )}
                  >
                    <IconTile icon={meta.icon} />
                    <span>
                      <span className="block text-sm leading-tight font-semibold">{s.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{meta.label}</span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        </section>

        <div className="liquid-glass rounded-[26px] p-2 focus-within:ring-3 focus-within:ring-ring/40">
          <label htmlFor="studio-prompt" className="sr-only">
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
            aria-describedby={error ? 'studio-prompt-error' : undefined}
            placeholder="What should the application help your teams achieve?"
            className="min-h-16 resize-none border-0 bg-transparent px-3 py-2 text-base shadow-none focus-visible:ring-0 md:text-[15px] dark:bg-transparent"
          />
          {error && (
            <p id="studio-prompt-error" className="px-3 pb-2 text-sm text-danger-ink">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Domain" className="flex flex-wrap gap-1">
              {domains.map((d) => {
                const selected = d.id === domain
                const Icon = d.icon
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={d.note}
                    onClick={() => setChosen(d.id)}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      selected ? 'bg-primary font-medium text-primary-foreground' : 'bg-white/60 text-muted-foreground hover:bg-white hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" />
                    {d.label}
                    {suggested === d.id && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">Suggested</span>}
                  </button>
                )
              })}
            </div>
            <div className="ml-auto flex gap-1.5">
              {onCancel && (
                <Button variant="ghost" className="rounded-full" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button className={ctaClass} onClick={start}>
                Start discovery
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="mx-auto max-w-3xl space-y-5">
      <section role="status" className="studio-card rounded-[24px] p-5">
        <h3 className="text-base font-semibold">I don’t have a scripted understanding for this description</h3>
        <p className="mt-1 text-sm text-muted-foreground">The OS has not interpreted your text. Your points are kept as written — pick the closest template.</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {unmatched.points.map((p) => (
            <li key={p} className="rounded-xl border border-studio-ink/10 bg-white px-2.5 py-1 text-[13px]">
              {p}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Templates">
        <ul className="grid gap-3 @2xl:grid-cols-3">
          {ordered.map((s) => {
            const meta = domainMeta(s.domain)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => startFrom(s)}
                  title={s.description}
                  className="studio-card flex h-full w-full flex-col gap-3 rounded-[22px] p-4 text-left outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex items-center justify-between gap-2">
                    <IconTile icon={meta.icon} />
                    {s.id === unmatched.closestScenarioId && <span className="rounded-full bg-info-soft px-2 text-[11px] leading-5 font-medium text-info-ink">Closest</span>}
                  </span>
                  <span>
                    <span className="block text-sm leading-tight font-semibold">{s.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{meta.label}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <Button variant="outline" className="rounded-full" onClick={onDone}>
        <Pencil />
        Rewrite the description
      </Button>
    </div>
  )
}

// ── Understanding ─────────────────────────────────────────────────────────

const groupIcon: Record<UnderstandingGroup, LucideIcon> = { objective: Target, people: Users, process: Workflow, information: Database, rules: Scale, capabilities: Puzzle }

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

/** A small picture of what a theme holds, drawn from its real items. */
function ThemeGlyph({ group, items }: { group: UnderstandingGroup; items: UnderstandingItem[] }) {
  const stroke = 'stroke-studio-ink/30'
  const dot = 'fill-actor-ai'
  switch (group) {
    case 'people':
      return (
        <span aria-hidden className="flex -space-x-1.5">
          {items.slice(0, 4).map((i) => (
            <span key={i.id} className="flex size-6 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground ring-2 ring-white">
              {i.text
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')}
            </span>
          ))}
        </span>
      )
    case 'objective':
      return (
        <svg aria-hidden viewBox="0 0 48 24" className="h-6 w-12">
          <circle cx="12" cy="12" r="10" className={cn('fill-none', stroke)} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5.5" className={cn('fill-none', stroke)} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" className="fill-primary" />
          <path d="M26 12h18m-5-4 5 4-5 4" className={cn('fill-none', stroke)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'process':
      return (
        <svg aria-hidden viewBox="0 0 64 24" className="h-6 w-16">
          <path d="M6 12h52" className={cn('studio-flow fill-none', stroke)} strokeWidth="1.5" />
          {[6, 24, 42, 58].slice(0, Math.max(2, Math.min(4, items.length))).map((x) => (
            <circle key={x} cx={x} cy="12" r="4" className={dot} />
          ))}
        </svg>
      )
    case 'information':
      return (
        <svg aria-hidden viewBox="0 0 64 24" className="h-6 w-16">
          <path d="M2 6h18M2 18h18M44 12h18" className={cn('studio-flow fill-none', stroke)} strokeWidth="1.5" />
          <rect x="22" y="3" width="20" height="18" rx="5" className="fill-primary" />
          <path d="M28 9h8M28 12h8M28 15h5" className="fill-none stroke-white/80" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'rules':
      return (
        <span aria-hidden className="flex items-end gap-0.5">
          {items.slice(0, 6).map((i, n) => (
            <span key={i.id} className="w-2 rounded-[3px] bg-actor-person" style={{ height: `${10 + ((n * 7) % 14)}px` }} />
          ))}
        </span>
      )
    case 'capabilities':
      return (
        <span aria-hidden className="grid grid-cols-5 gap-0.5">
          {items.slice(0, 10).map((i) => (
            <span key={i.id} className="size-2.5 rounded-[3px] bg-actor-ai" />
          ))}
        </span>
      )
  }
}

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

function ItemCard({
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
      <li className="rounded-2xl border border-studio-ink/10 bg-white p-2 @3xl:col-span-2">
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
    <li className="group relative flex min-h-[3.75rem] flex-col justify-between gap-1 rounded-2xl border border-studio-ink/10 bg-white px-3 py-2.5">
      <p className="pr-12 text-[13px] leading-snug font-medium">{item.text}</p>
      <p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
        <SourceCue item={item} domainLabel={domainLabel} />
      </p>
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[3.75rem] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-studio-ink/20 text-[13px] text-muted-foreground outline-none hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Plus aria-hidden className="size-4" />
        {label}
      </button>
    )
  }
  return (
    <form
      className="flex min-h-[3.75rem] items-center gap-2 rounded-2xl border border-studio-ink/10 bg-white p-2"
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
  const [showEvidence, setShowEvidence] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [theme, setTheme] = useState<UnderstandingGroup>('capabilities')
  const openGroup = GROUPS.find((g) => g.id === theme)!

  return (
    <div className="space-y-5">
      <section aria-label="Summary of understanding" className="studio-card rounded-[24px] p-4">
        <div className="flex flex-wrap items-start gap-3">
          <IconTile icon={Sparkles} />
          <div className="min-w-0 flex-1 basis-80">
            <span className="rounded-full bg-accent px-2 text-[11px] leading-5 font-medium text-accent-foreground">{scenario.label}</span>
            <p title={understanding.summary} className="mt-1 line-clamp-3 text-[15px] leading-snug font-medium">
              {understanding.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {understanding.matchedPhrases.length > 0 && (
              <Button size="xs" variant="ghost" aria-expanded={showEvidence} onClick={() => setShowEvidence(!showEvidence)}>
                <Quote />
                Evidence
              </Button>
            )}
            <Button size="xs" variant="ghost" aria-expanded={showPrompt} onClick={() => setShowPrompt(!showPrompt)}>
              <FileText />
              Your description
            </Button>
            <Button size="xs" variant="ghost" onClick={onEditPrompt}>
              <Pencil />
              Edit description
            </Button>
          </div>
        </div>
        {showEvidence && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Based on your words</span>
            {understanding.matchedPhrases.map((p) => (
              <span key={p} className="rounded-full bg-actor-ai-soft px-2 py-0.5 font-medium text-actor-ai">
                “{p}”
              </span>
            ))}
            <CornerDownRight aria-hidden className="size-3 text-muted-foreground" />
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{domainLabel} domain pack</span>
          </div>
        )}
        {showPrompt && <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-sm">“{project?.discover.prompt}”</p>}
      </section>

      {understanding.questions.length > 0 && (
        <section aria-label="Clarifying questions" className="grid gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
          {understanding.questions.map((q) => {
            const chosen = q.options.find((o) => o.id === q.answer)
            return (
              <div key={q.id} className={cn('rounded-[22px] p-4', q.answer ? 'border border-white/70 bg-white/40' : 'border border-primary/20 bg-accent/70')}>
                <p className="flex items-center gap-1 text-[13px] leading-snug font-medium">
                  {q.text}
                  <InfoTip label={`Why this question: ${q.text}`}>
                    {q.why}
                  </InfoTip>
                </p>
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
                  <div role="group" aria-label={q.text} className="mt-2.5 flex flex-wrap gap-1.5">
                    {q.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => update(answerQuestion(understanding, q.id, o.id))}
                        className="rounded-full border border-primary/15 bg-white px-3 py-1 text-[13px] font-medium text-foreground outline-none hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {o.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => update(answerQuestion(understanding, q.id, 'skipped'))} className="rounded-full px-3 py-1 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      <section aria-label="Themes" className="studio-card space-y-3 rounded-[24px] p-3">
        <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-3 @6xl:grid-cols-6">
          {GROUPS.map((group) => {
            const items = understanding.items.filter((i) => group.kinds.some((k) => k.kind === i.kind))
            const Icon = groupIcon[group.id]
            const selected = group.id === theme
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(group.id)}
                className={cn('relative flex h-[6.5rem] flex-col justify-between rounded-[18px] p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50', selected ? 'bg-white shadow-studio ring-2 ring-primary' : 'bg-white/45 hover:bg-white/80')}
              >
                <span className="flex items-center justify-between gap-2">
                  <IconTile icon={Icon} size="sm" />
                  <ThemeGlyph group={group.id} items={items} />
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="text-[13px] leading-tight font-semibold">{group.title}</span>
                  <span className="text-lg leading-none font-bold tabular-nums">{items.length}</span>
                </span>
              </button>
            )
          })}
        </div>

        <motion.div key={theme} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-3 px-1 pb-1">
          {openGroup.kinds.map(({ kind, label, add }) => {
            const list = understanding.items.filter((i) => i.kind === kind)
            return (
              <div key={kind} role="group" aria-label={label}>
                {openGroup.kinds.length > 1 && <SectionLabel className="mb-1.5">{label}</SectionLabel>}
                <ul className="grid gap-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
                  {list.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      domainLabel={domainLabel}
                      removable={kind !== 'objective' && kind !== 'problem'}
                      onChange={(text) => setItems(understanding.items.map((i) => (i.id === item.id ? { ...i, text } : i)))}
                      onRemove={() => setItems(understanding.items.filter((i) => i.id !== item.id))}
                    />
                  ))}
                  {add && (
                    <li>
                      <AddItem
                        label={add}
                        onAdd={(text) => {
                          const n = understanding.items.reduce((m, i) => Math.max(m, Number(i.id.match(/^usr-disc-(\d+)/)?.[1] ?? 0)), 0) + 1
                          setItems([...understanding.items, { id: `usr-disc-${n}`, kind, text, source: 'user', capabilityIds: [] }])
                        }}
                      />
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </motion.div>
      </section>

      {understanding.suggestions.length > 0 && (
        <section aria-label="Possibly missing">
          <SectionLabel className="mb-2 px-1">Possibly missing</SectionLabel>
          <ul className="grid gap-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
            {understanding.suggestions.map((s) => (
              <li key={s.id} className={cn('flex items-center gap-2 rounded-2xl border border-dashed border-studio-ink/20 bg-white/50 py-2 pr-2 pl-3', s.status === 'accepted' && 'border-solid border-success/40 bg-success-soft/40', s.status === 'rejected' && 'opacity-70')}>
                <p className={cn('min-w-0 flex-1 text-[13px] leading-snug font-medium', s.status === 'rejected' && 'text-muted-foreground line-through')}>{s.text}</p>
                <InfoTip label={`Why suggested: ${s.text}`}>{s.reason}</InfoTip>
                {s.status === 'pending' ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon-xs" className="rounded-full" aria-label={`Accept: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'accepted'))}>
                      <Plus />
                    </Button>
                    <Button size="icon-xs" variant="outline" className="rounded-full bg-white" aria-label={`Reject: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'rejected'))}>
                      <X />
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {s.status === 'accepted' ? 'Added' : 'Rejected'}
                    <Button size="icon-xs" variant="ghost" aria-label={`Undo: ${s.text}`} onClick={() => update(decideSuggestion(understanding, s.id, 'pending'))}>
                      <Undo2 />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function DiscoverStage() {
  const { project, dispatch } = useStudio()
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [unmatched, setUnmatched] = useState<Unmatched | null>(null)
  const [thinking, setThinking] = useState<ThinkingProps | null>(null)
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
      <StageFrame stage="discover" hideHeader thinking={thinking}>
        <DescribeForm
          initialPrompt={project?.discover.prompt ?? ''}
          initialDomain={project?.discover.domain ?? null}
          onCancel={editingPrompt ? () => setEditingPrompt(false) : undefined}
          onUnmatched={setUnmatched}
          onThinking={setThinking}
        />
      </StageFrame>
    )
  }

  const domainLabel = domains.find((d) => d.id === scenario.domain)?.label ?? scenario.domain
  const capabilityCount = understanding.items.filter((i) => i.kind === 'capability').length
  const pending = understanding.questions.filter((q) => !q.answer).length

  return (
    <StageFrame
      stage="discover"
      footer={
        <>
          {capabilityCount === 0 ? <span className="text-danger-ink">Add at least one capability.</span> : pending > 0 ? <span className="text-muted-foreground tabular-nums">{pending} open {pending === 1 ? 'question' : 'questions'}</span> : null}
          <Button className={ctaClass} disabled={capabilityCount === 0} onClick={() => dispatch({ type: 'discover/confirm' })}>
            {project.progress.discover === 'complete' ? 'Update requirements' : 'Confirm understanding'}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <UnderstandingView understanding={understanding} scenario={scenario} domainLabel={domainLabel} onEditPrompt={() => setEditingPrompt(true)} />
    </StageFrame>
  )
}
