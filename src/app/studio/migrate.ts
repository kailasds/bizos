import { buildUnderstanding } from '@/app/services/mock/intent-service'
import { getScenario } from '@/data/studio-scenarios.mock'
import type { CapabilityMapping, InterpretationItem, MappingStatus, StudioProject } from './types'

type Loose = Record<string, unknown>

/** Milestone 2 coverage statuses → Milestone 3 selection model (M2 mapped resources were in use). */
function migrateMapping(m: Loose): CapabilityMapping {
  if (typeof m.conditional === 'boolean' && typeof m.created === 'boolean') return m as unknown as CapabilityMapping
  const old = m.status as string
  const status: MappingStatus = old === 'missing' ? 'missing' : 'selected'
  return { ...(m as unknown as CapabilityMapping), status, created: old === 'created', conditional: old === 'restricted' }
}

/**
 * Brings drafts saved by earlier milestones up to the current shape so a reload never
 * resets the user's progress. Idempotent.
 */
export function migrateProject(raw: Loose): StudioProject {
  const p = raw as unknown as StudioProject & Loose
  const project: StudioProject = {
    ...p,
    validationRuns: p.validationRuns ?? [],
    publications: p.publications ?? (p.publication ? [{ version: p.publication.version, publishedAt: p.publication.publishedAt }] : []),
    decisions: p.decisions ?? [],
    revisions: p.revisions ?? [],
  }

  // Validate is no longer a stage: its checks run automatically on Publish.
  if ((project.activeStage as string) === 'validate') project.activeStage = 'publish'
  if ('validate' in project.progress) {
    const { validate: _progress, ...progress } = project.progress as Record<string, unknown>
    project.progress = progress as StudioProject['progress']
  }
  if ('validate' in project.staleReasons) {
    const { validate: _reason, ...staleReasons } = project.staleReasons as Record<string, string>
    project.staleReasons = staleReasons
  }

  if (!project.discover.understanding) {
    const scenario = getScenario(project.scenarioId)
    const old = (project.discover.interpretation ?? []) as InterpretationItem[]
    if (scenario) {
      const u = buildUnderstanding(project.discover.prompt, scenario)
      if (old.length) {
        u.items = [
          ...u.items.filter((i) => i.kind !== 'capability'),
          ...old.map((i) => ({ id: i.id, kind: 'capability' as const, text: i.text, capabilityIds: i.capabilityIds, source: i.source === 'user' ? ('user' as const) : ('description' as const) })),
        ]
      }
      project.discover = { ...project.discover, understanding: u }
    } else {
      project.discover = { ...project.discover, understanding: null }
    }
  }

  if (project.composition) {
    const c = project.composition as unknown as Loose
    project.composition = {
      createdWorkers: project.composition.createdWorkers ?? [],
      rejected: (c.rejected as string[]) ?? [],
      attempts: (c.attempts as Record<string, number>) ?? {},
      mappings: ((c.mappings as Loose[]) ?? []).map(migrateMapping),
    }
  }
  return project
}
