/**
 * Mock intelligence for Application Studio. Every function is deterministic:
 * the same input always produces the same output. A later phase replaces these
 * with the Intent Engine, Solution Architect and Capability Discovery services.
 */

import type { RequirementSpec, SolutionOption, SpecItem } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import { resourceCatalogue, workerProposals, type CatalogueResource } from '@/data/studio-resources.mock'
import { studioScenarios } from '@/data/studio-scenarios.mock'
import type { CapabilityMapping, CreatedWorker, InterpretationItem, StudioScenario } from '../types'

export const MIN_PROMPT_LENGTH = 24

/** The domain whose vocabulary the description uses most, if any. */
export function suggestDomain(prompt: string): DomainId | null {
  const text = prompt.toLowerCase()
  let best: { domain: DomainId; hits: number } | null = null
  for (const scenario of studioScenarios) {
    const hits = scenario.domainKeywords.filter((k) => text.includes(k)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { domain: scenario.domain, hits }
  }
  return best?.domain ?? null
}

export function interpret(prompt: string, scenario: StudioScenario): InterpretationItem[] {
  const text = prompt.toLowerCase()
  return scenario.interpretation
    .filter((rule) => !rule.keywords || rule.keywords.some((k) => text.includes(k)))
    .map((rule) => ({ id: rule.id, text: rule.text, capabilityIds: rule.capabilityIds, source: 'os' as const }))
}

export function capabilityLabel(scenario: StudioScenario, capabilityId: string): string {
  return (
    scenario.capabilities.find((c) => c.capabilityId === capabilityId)?.label ??
    scenario.capabilityLabels[capabilityId] ??
    capabilityId
  )
}

/**
 * Builds (or rebuilds) the requirement specification from the confirmed interpretation.
 * When rebuilding, the user's edits are kept; only capabilities follow the interpretation.
 */
export function buildRequirements(
  scenario: StudioScenario,
  interpretation: InterpretationItem[],
  previous: RequirementSpec | null,
): RequirementSpec {
  const wanted = new Set(interpretation.flatMap((i) => i.capabilityIds))
  const fromCatalogue = scenario.capabilities.filter((c) => c.capabilityId && wanted.has(c.capabilityId))
  const fromUser: SpecItem[] = interpretation
    .filter((i) => i.source === 'user')
    .map((i) => ({ id: `cap-${i.id}`, label: i.text, description: 'Added during discovery.' }))

  if (!previous) {
    return {
      version: 1,
      objective: scenario.objective,
      users: scenario.users,
      capabilities: [...fromCatalogue, ...fromUser],
      inputs: scenario.inputs,
      outputs: scenario.outputs,
      constraints: scenario.constraints,
      successCriteria: scenario.successCriteria,
    }
  }

  const derivedIds = new Set([...fromCatalogue, ...fromUser].map((c) => c.id))
  // Keep items the user added in Define, drop derived items no longer in the interpretation.
  const kept = previous.capabilities.filter((c) => c.id.startsWith('usr-') || derivedIds.has(c.id))
  const added = [...fromCatalogue, ...fromUser].filter((c) => !kept.some((k) => k.id === c.id))
  return { ...previous, capabilities: [...kept, ...added] }
}

export function specCapabilityIds(spec: RequirementSpec): Set<string> {
  return new Set(spec.capabilities.map((c) => c.capabilityId).filter((id): id is string => Boolean(id)))
}

export function buildOptions(scenario: StudioScenario, spec: RequirementSpec): SolutionOption[] {
  const caps = specCapabilityIds(spec)
  return scenario.options.map((option) => ({
    ...option,
    steps: option.steps
      .filter((step) => !step.requires || caps.has(step.requires))
      .map(({ requires: _requires, ...step }) => step),
  }))
}

/** What each automated/system step and supporting need maps to, preferring existing resources. */
export function mapCapabilities(
  scenario: StudioScenario,
  option: SolutionOption,
  created: CreatedWorker[],
): CapabilityMapping[] {
  const needs = new Map<string, string[]>()
  for (const step of option.steps) {
    const capabilityId = step.actor === 'human' ? 'human-task' : step.capabilityId
    needs.set(capabilityId, [...(needs.get(capabilityId) ?? []), step.id])
  }
  for (const capabilityId of option.supportingCapabilities) if (!needs.has(capabilityId)) needs.set(capabilityId, [])

  return [...needs.entries()].map(([capabilityId, stepIds]) => {
    const createdWorker = created.find((w) => w.capabilityId === capabilityId)
    const existing = findResource(capabilityId, scenario.domain)
    const resource = createdWorker?.resource ?? existing
    const status = createdWorker
      ? 'created'
      : !resource
        ? 'missing'
        : resource.availability === 'available'
          ? 'available'
          : 'restricted'
    return {
      id: `map-${capabilityId}`,
      capabilityId,
      need: capabilityLabel(scenario, capabilityId),
      category: resource?.kind ?? 'worker',
      stepIds,
      resource,
      status,
    }
  })
}

export function findResource(capabilityId: string, domain: DomainId): CatalogueResource | null {
  return (
    resourceCatalogue.find(
      (r) => r.capabilityIds.includes(capabilityId) && (r.domains === 'all' || r.domains.includes(domain)),
    ) ?? null
  )
}

export function proposalFor(capabilityId: string) {
  return workerProposals.find((p) => p.capabilityId === capabilityId) ?? null
}

/** The resource a successful (simulated) composition produces. */
export function composedWorker(capabilityId: string, domain: DomainId): CatalogueResource {
  const proposal = proposalFor(capabilityId)
  const name = proposal?.name ?? 'Composed Worker'
  return {
    id: `WRK-${capabilityId}`,
    name,
    version: '0.1.0',
    kind: 'worker',
    owner: 'AI Workers Platform',
    capabilityIds: [capabilityId],
    domains: [domain],
    availability: 'available',
    note: 'Composed for this application. Validation passed in simulation; pinned at 0.1.0.',
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}
