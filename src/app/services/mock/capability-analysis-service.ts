/**
 * MOCK — Capability discovery and gap analysis (context.md Layer 3/4), simulated.
 *
 * Maps every need of the selected approach to a catalogue resource, preferring existing
 * resources, and proposes a worker composition when nothing matches. Composition is
 * simulated: nothing is created on the AI Workers Platform.
 */

import type { SolutionOption } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import type { CapabilityMapping, CreatedWorker, MappingStatus, StudioScenario } from '@/app/studio/types'
import { compositionSequence, platformResources, workerProposals, type PlatformResource, type WorkerProposal } from '@/data/resources.mock'

export function capabilityLabel(scenario: StudioScenario, capabilityId: string): string {
  return (
    scenario.capabilities.find((c) => c.capabilityId === capabilityId)?.label ??
    scenario.capabilityLabels[capabilityId] ??
    capabilityId
  )
}

export function findResource(capabilityId: string, domain: DomainId): PlatformResource | null {
  return (
    platformResources.find(
      (r) =>
        r.capabilityIds.includes(capabilityId) &&
        r.availability !== 'validating' &&
        (r.domains === 'all' || r.domains.includes(domain)),
    ) ?? null
  )
}

export const isConditional = (r: PlatformResource) => r.availability !== 'available' || Boolean(r.configuration)

/** Which need a step maps to: human steps all use the human task service. */
export const needOf = (step: { actor: string; capabilityId: string }) => (step.actor === 'human' ? 'human-task' : step.capabilityId)

/**
 * Coverage of the selected approach. Selections made earlier are kept when the same
 * resource still covers the same need; composed workers are always selected.
 */
export function mapCapabilities(
  scenario: StudioScenario,
  option: SolutionOption,
  createdWorkers: CreatedWorker[],
  previous: CapabilityMapping[] = [],
): CapabilityMapping[] {
  const needs = new Map<string, string[]>()
  for (const step of option.steps) {
    const id = needOf(step)
    needs.set(id, [...(needs.get(id) ?? []), step.id])
  }
  for (const id of option.supportingCapabilities) if (!needs.has(id)) needs.set(id, [])

  return [...needs.entries()].map(([capabilityId, stepIds]) => {
    const created = createdWorkers.find((w) => w.capabilityId === capabilityId)
    const resource = created?.resource ?? findResource(capabilityId, scenario.domain)
    const before = previous.find((m) => m.capabilityId === capabilityId && m.resource?.id === resource?.id)
    const conditional = !created && !!resource && isConditional(resource)
    const status: MappingStatus = created
      ? 'selected'
      : !resource
        ? 'missing'
        : before?.status === 'selected'
          ? 'selected'
          : conditional
            ? 'requires-configuration'
            : 'available'
    return {
      id: `map-${capabilityId}`,
      capabilityId,
      need: capabilityLabel(scenario, capabilityId),
      category: resource?.kind ?? 'worker',
      stepIds,
      resource,
      status,
      created: Boolean(created),
      conditional,
    }
  })
}

export function coverageCounts(mappings: CapabilityMapping[]): Record<MappingStatus, number> {
  const counts: Record<MappingStatus, number> = { available: 0, selected: 0, 'requires-configuration': 0, missing: 0 }
  for (const m of mappings) counts[m.status] += 1
  return counts
}

export function proposalFor(capabilityId: string): WorkerProposal | null {
  return workerProposals.find((p) => p.capabilityId === capabilityId) ?? null
}

/** The steps a composition plays, and whether this attempt fails (deterministic). */
export function compositionPlan(capabilityId: string, attempt: number): { steps: string[]; failAt: number | null; message?: string } {
  const failure = proposalFor(capabilityId)?.firstAttemptFailure
  if (failure && attempt === 0) return { steps: compositionSequence, failAt: failure.atStep, message: failure.message }
  return { steps: compositionSequence, failAt: null }
}

/** The resource a successful (simulated) composition produces. */
export function composedWorker(capabilityId: string, domain: DomainId): PlatformResource {
  const p = proposalFor(capabilityId)
  return {
    id: `WRK-${capabilityId}`,
    name: p?.name ?? 'Composed Worker',
    kind: 'worker',
    owner: 'AI Workers Platform',
    version: '0.1.0',
    capabilityIds: [capabilityId],
    domains: [domain],
    availability: 'available',
    note: 'Composed for this application (simulated). Validation passed; pinned at 0.1.0.',
    purpose: p?.purpose ?? '',
    responsibilities: p?.responsibilities ?? [],
    dependencies: p?.agentAccess ?? [],
    technical: { endpoint: `mock://awp/workers/WRK-${capabilityId}`, contract: { inputs: [], outputs: [] }, lastValidated: 'Simulated' },
  }
}
