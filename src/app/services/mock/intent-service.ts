/**
 * MOCK — Intent & Requirement Intelligence (context.md Layer 2), simulated.
 *
 * Matches the description against the scripted scenarios by keyword and assembles an
 * Understanding from fixtures. It never claims to understand a description that matches
 * no scenario: those return `unmatched` with the user's own points, unstructured.
 */

import type { RequirementSpec, SpecItem } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import type { SpecListKey, StudioScenario, Understanding, UnderstandingItem, UnderstandingKind } from '@/app/studio/types'
import { scenarioForDomain, studioScenarios } from '@/data/studio-scenarios.mock'
import { fail, ok, simulate, type MockResult } from './simulate'

export const MIN_PROMPT_LENGTH = 24

const hits = (text: string, keywords: string[]) => keywords.filter((k) => text.includes(k))

/** The scenario whose vocabulary the description uses most, if any. */
export function suggestDomain(prompt: string): DomainId | null {
  const text = prompt.toLowerCase()
  let best: { domain: DomainId; n: number } | null = null
  for (const s of studioScenarios) {
    const n = hits(text, s.domainKeywords).length
    if (n > 0 && (!best || n > best.n)) best = { domain: s.domain, n }
  }
  return best?.domain ?? null
}

/** A few words of the user's own text around a keyword, for evidence cues. */
export function findQuote(prompt: string, keywords: string[]): string | undefined {
  const lower = prompt.toLowerCase()
  for (const k of keywords) {
    const at = lower.indexOf(k)
    if (at < 0) continue
    const before = prompt.slice(0, at).split(/\s+/).slice(-3).join(' ')
    const after = prompt.slice(at).split(/[.,;!?]/)[0].split(/\s+/).slice(0, 4).join(' ')
    return `${before} ${after}`.replace(/^[^A-Za-z0-9]+/, '').trim()
  }
  return undefined
}

/** The user's description split into points (used only when no scenario matches). */
export function splitPoints(prompt: string): string[] {
  return prompt
    .split(/(?<=[.!?])\s+|\n+|;\s+/)
    .map((s) => s.trim().replace(/[.]$/, ''))
    .filter((s) => s.length > 3)
    .slice(0, 6)
}

function joinClauses(parts: string[]) {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

export function buildUnderstanding(prompt: string, scenario: StudioScenario, extraPoints: string[] = []): Understanding {
  const text = prompt.toLowerCase()
  const item = (kind: UnderstandingKind, spec: SpecItem): UnderstandingItem => {
    const quote = findQuote(prompt, scenario.evidence[spec.id] ?? [])
    return {
      id: spec.id,
      kind,
      text: spec.label,
      detail: spec.description,
      source: quote ? 'description' : 'domain',
      quote,
      capabilityIds: spec.capabilityId ? [spec.capabilityId] : [],
    }
  }

  const capabilityRules = scenario.interpretation.filter((r) => !r.keywords || hits(text, r.keywords).length > 0)
  const capabilities: UnderstandingItem[] = capabilityRules.map((r) => {
    const quote = r.keywords ? findQuote(prompt, r.keywords) : undefined
    return { id: r.id, kind: 'capability', text: r.text, source: quote ? 'description' : 'domain', quote, capabilityIds: r.capabilityIds }
  })
  const covered = new Set(capabilities.flatMap((c) => c.capabilityIds))

  const items: UnderstandingItem[] = [
    { id: 'objective', kind: 'objective', text: scenario.objective, source: 'description', quote: findQuote(prompt, scenario.domainKeywords), capabilityIds: [] },
    { id: 'problem', kind: 'problem', text: scenario.problem, source: 'domain', capabilityIds: [] },
    ...scenario.successCriteria.map((s) => item('outcome', s)),
    ...scenario.users.map((s) => item('user', s)),
    ...scenario.processes.map((s) => item('process', s)),
    ...scenario.challenges.map((s) => item('challenge', s)),
    ...scenario.inputs.map((s) => item('input', s)),
    ...scenario.outputs.map((s) => item('output', s)),
    ...scenario.integrations.map((s) => item('integration', s)),
    ...scenario.constraints.map((s) => item('constraint', s)),
    ...capabilities,
    ...extraPoints.map((p, i) => ({ id: `usr-disc-${i + 1}`, kind: 'capability' as const, text: p, source: 'user' as const, capabilityIds: [] })),
  ]

  const clauses = capabilityRules.map((r) => scenario.summary.clauses[r.id]).filter(Boolean)
  const matchedPhrases = [
    ...new Set(
      [...hits(text, scenario.domainKeywords), ...capabilityRules.flatMap((r) => (r.keywords ? hits(text, r.keywords) : []))]
        .map((k) => findQuote(prompt, [k]))
        .filter((q): q is string => Boolean(q)),
    ),
  ].slice(0, 4)

  return {
    scenarioId: scenario.id,
    summary: `You want ${scenario.summary.base}${clauses.length ? `, which ${joinClauses(clauses)}` : ''}.`,
    matchedPhrases,
    items,
    suggestions: scenario.suggestions
      .filter((s) => !s.capabilityIds?.every((c) => covered.has(c)))
      .map((s) => ({ ...s, status: 'pending' as const })),
    questions: scenario.questions.map((q) => ({ ...q, answer: null })),
  }
}

export type IntentResult =
  | { kind: 'understood'; scenarioId: string; understanding: Understanding }
  | { kind: 'unmatched'; points: string[]; closestScenarioId: string | null }

/** Simulated intent understanding (async, as a real service would be). */
export function understandIntent(input: { prompt: string; domain: DomainId }, latencyMs: number): Promise<MockResult<IntentResult>> {
  return simulate(() => {
    const prompt = input.prompt.trim()
    if (prompt.length < MIN_PROMPT_LENGTH) {
      return fail('too-short', `Describe the problem in a sentence or two (at least ${MIN_PROMPT_LENGTH} characters) so the OS has enough to work with.`)
    }
    const scenario = scenarioForDomain(input.domain)
    if (hits(prompt.toLowerCase(), scenario.domainKeywords).length === 0) {
      const closest = suggestDomain(prompt)
      return ok({ kind: 'unmatched', points: splitPoints(prompt), closestScenarioId: closest ? scenarioForDomain(closest).id : null })
    }
    return ok({ kind: 'understood', scenarioId: scenario.id, understanding: buildUnderstanding(prompt, scenario) })
  }, latencyMs)
}

// ── Editing the understanding ───────────────────────────────────────────

export function answerQuestion(u: Understanding, questionId: string, optionId: string | null): Understanding {
  const question = u.questions.find((q) => q.id === questionId)
  if (!question) return u
  const option = question.options.find((o) => o.id === optionId)
  const itemId = `ans-${questionId}`
  let items = u.items.filter((i) => i.id !== itemId)
  if (option?.effect.kind === 'add') {
    items = [...items, { id: itemId, kind: option.effect.itemKind, text: option.effect.text, source: 'answer', capabilityIds: option.effect.capabilityIds ?? [] }]
  }
  return { ...u, items, questions: u.questions.map((q) => (q.id === questionId ? { ...q, answer: optionId } : q)) }
}

export function decideSuggestion(u: Understanding, suggestionId: string, decision: 'accepted' | 'rejected' | 'pending'): Understanding {
  const s = u.suggestions.find((x) => x.id === suggestionId)
  if (!s) return u
  const itemId = `sug-item-${s.id}`
  const items = u.items.filter((i) => i.id !== itemId)
  if (decision === 'accepted') items.push({ id: itemId, kind: s.kind, text: s.text, source: 'suggestion', capabilityIds: s.capabilityIds ?? [] })
  return { ...u, items, suggestions: u.suggestions.map((x) => (x.id === suggestionId ? { ...x, status: decision } : x)) }
}

export function approverFrom(u: Understanding): string | null {
  for (const q of u.questions) {
    const o = q.options.find((x) => x.id === q.answer)
    if (o?.effect.kind === 'approver') return o.effect.role
  }
  return null
}

// ── Requirement specification ───────────────────────────────────────────

function mergeList(derived: SpecItem[], previous: SpecItem[] | undefined): SpecItem[] {
  if (!previous) return derived
  const prev = new Map(previous.map((i) => [i.id, i]))
  const merged = derived.map((d) => (prev.has(d.id) ? { ...d, label: prev.get(d.id)!.label } : d))
  return [...merged, ...previous.filter((p) => p.id.startsWith('usr-') && !derived.some((d) => d.id === p.id))]
}

/**
 * Builds (or rebuilds) the requirement specification from the confirmed understanding.
 * When rebuilding, labels the user edited in Define and items they added there are kept.
 */
export function buildRequirements(scenario: StudioScenario, u: Understanding, previous: RequirementSpec | null): RequirementSpec {
  const of = (kind: UnderstandingKind) => u.items.filter((i) => i.kind === kind)
  const spec = (i: UnderstandingItem): SpecItem => ({ id: i.id, label: i.text, ...(i.detail ? { description: i.detail } : {}) })

  const capabilityItems = of('capability')
  const wanted = new Set(capabilityItems.flatMap((i) => i.capabilityIds))
  const fromCatalogue = scenario.capabilities.filter((c) => c.capabilityId && wanted.has(c.capabilityId))
  const custom = capabilityItems
    .filter((i) => i.capabilityIds.length === 0)
    .map((i) => ({ id: `cap-${i.id}`, label: i.text, description: 'Added during discovery.' }))

  const objective = of('objective')[0]?.text ?? scenario.objective
  const derived = {
    users: of('user').map(spec),
    capabilities: [...fromCatalogue, ...custom],
    inputs: of('input').map(spec),
    outputs: of('output').map(spec),
    constraints: of('constraint').map(spec),
    successCriteria: of('outcome').map(spec),
  }
  const lists = Object.fromEntries(
    (Object.keys(derived) as SpecListKey[]).map((k) => [k, mergeList(derived[k], previous?.[k])]),
  ) as Record<SpecListKey, SpecItem[]>

  return {
    version: previous?.version ?? 1,
    objective: previous && previous.objective !== scenario.objective ? previous.objective : objective,
    ...lists,
    context: {
      problem: of('problem')[0]?.text ?? scenario.problem,
      processes: of('process').map(spec),
      challenges: of('challenge').map(spec),
      integrations: of('integration').map(spec),
    },
    approverRole: approverFrom(u),
  }
}

export function specCapabilityIds(spec: RequirementSpec): Set<string> {
  return new Set(spec.capabilities.map((c) => c.capabilityId).filter((id): id is string => Boolean(id)))
}
