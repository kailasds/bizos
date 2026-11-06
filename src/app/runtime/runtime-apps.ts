/**
 * Which published applications the runtime can execute, and the blueprint each runs on.
 *
 * - Applications published from Application Studio run their pinned published blueprint.
 * - The built-in Claims Intelligence application gets a blueprint compiled once, deterministically,
 *   by the same generator Studio uses (insurance scenario, AI-Driven Claims Automation). Accepted
 *   improvements create draft versions of it in the runtime store; it changes only when published.
 */

import { applyPatch, generateBlueprint } from '@/app/blueprint/generate'
import type { ApplicationBlueprint } from '@/app/blueprint/types'
import { getGeneratedApp, listApps } from '@/app/registry/applicationRegistry'
import { buildOptions } from '@/app/services/mock/architecture-service'
import { composedWorker, mapCapabilities } from '@/app/services/mock/capability-analysis-service'
import { buildRequirements, buildUnderstanding } from '@/app/services/mock/intent-service'
import type { CapabilityMapping } from '@/app/studio/types'
import { getScenario } from '@/data/studio-scenarios.mock'
import type { BuiltinBlueprintState, RuntimeApp, RuntimeState } from './types'

export const BUILTIN_RUNTIME_APP = 'claims-intelligence'

let compiled: { blueprint: ApplicationBlueprint; mappings: CapabilityMapping[] } | null = null

/** Compiled on first use; identical every time (no dates, no randomness). */
export function claimsIntelligenceBlueprint() {
  if (compiled) return compiled
  const scenario = getScenario('insurance-claims')!
  const prompt = 'Automate insurance claims processing: capture first notice of loss, extract documents, validate coverage, screen claims for fraud and route complex claims to claims managers for approval.'
  const understanding = buildUnderstanding(prompt, scenario)
  const requirements = { ...buildRequirements(scenario, understanding, null), approverRole: 'claims-manager' }
  const base = buildOptions(scenario, requirements).find((o) => o.id === 'opt-orchestrated')!
  const option = { ...base, steps: base.steps.map((s) => (s.actor === 'human' ? { ...s, role: 'claims-manager' } : s)) }
  const worker = composedWorker('fraud-investigation', 'insurance')
  const mappings = mapCapabilities(scenario, option, [{ capabilityId: 'fraud-investigation', resource: worker, createdAt: 'Built in' }]).map((m) => ({
    ...m,
    status: 'selected' as const,
  }))
  const raw = generateBlueprint({ projectId: 'builtin-claims', name: 'Claims Intelligence', scenario, requirements, option, mappings, previous: null })
  // The investigation workspace records notes; the built-in data model includes that field.
  const generated = applyPatch(raw, { kind: 'add-field', entityId: raw.dataModel.primaryEntity, field: { id: 'investigationNotes', label: 'Investigation notes', type: 'longtext' } })
  compiled = {
    mappings,
    blueprint: {
      ...generated,
      applicationId: BUILTIN_RUNTIME_APP,
      description: 'Triage, assess and approve insurance claims with AI-assisted review.',
      version: '0.4.0',
      status: 'published',
    },
  }
  return compiled
}

export function initialBuiltinState(publishedAt: string): Record<string, BuiltinBlueprintState> {
  const { blueprint } = claimsIntelligenceBlueprint()
  return {
    [BUILTIN_RUNTIME_APP]: {
      published: { version: blueprint.version, blueprint, publishedAt },
      draft: null,
      history: [{ version: blueprint.version, at: publishedAt, summary: 'Built-in blueprint (AI-Driven Claims Automation)', publishedAt }],
    },
  }
}

export function getRuntimeApp(appId: string, state: RuntimeState): RuntimeApp | null {
  const builtin = state.builtin[appId]
  if (builtin) {
    return { appId, name: builtin.published.blueprint.name, domain: builtin.published.blueprint.domain, version: builtin.published.version, blueprint: builtin.published.blueprint, source: 'builtin' }
  }
  const record = getGeneratedApp(appId)
  if (!record) return null
  return { appId, name: record.name, domain: record.domain, version: record.version, blueprint: record.blueprint, source: 'studio', projectId: record.projectId }
}

/** Every application the runtime can run, in registry order. */
export function listRuntimeApps(state: RuntimeState): RuntimeApp[] {
  return listApps()
    .map((a) => getRuntimeApp(a.id, state))
    .filter((a): a is RuntimeApp => Boolean(a))
}

export function isRunnable(appId: string, state: RuntimeState) {
  return Boolean(getRuntimeApp(appId, state))
}
