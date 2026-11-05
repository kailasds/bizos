import { applyPatch, bumpVersion, describePatch, generateBlueprint, type BlueprintPatch } from '@/app/blueprint/generate'
import type { ApplicationBlueprint, RequirementSpec } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import { buildOptions } from '@/app/services/mock/architecture-service'
import { diffBlueprints } from '@/app/services/mock/blueprint-service'
import { mapCapabilities, proposalFor } from '@/app/services/mock/capability-analysis-service'
import { buildRequirements } from '@/app/services/mock/intent-service'
import { getScenario } from '@/data/studio-scenarios.mock'
import {
  STAGES,
  type ArchitectMessage,
  type BlueprintRevision,
  type BlueprintSection,
  type CreatedWorker,
  type StageId,
  type StageProgress,
  type StudioDecision,
  type StudioProject,
  type Understanding,
  type ValidationFinding,
} from './types'

export interface StudioState {
  projects: StudioProject[]
  activeProjectId: string | null
}

export const initialStudioState: StudioState = { projects: [], activeProjectId: null }

const MAX_REVISIONS = 20

export type StudioAction =
  | { type: 'project/create'; prompt: string; domain: DomainId; scenarioId: string; name: string; understanding: Understanding; now: string }
  | { type: 'project/open'; id: string }
  | { type: 'project/close' }
  | { type: 'project/delete'; id: string }
  | { type: 'project/rename'; name: string }
  | { type: 'stage/go'; stage: StageId }
  | { type: 'discover/reinterpret'; prompt: string; domain: DomainId; scenarioId: string; understanding: Understanding }
  | { type: 'discover/update'; understanding: Understanding }
  | { type: 'discover/confirm' }
  | { type: 'define/update'; requirements: RequirementSpec }
  | { type: 'define/confirm'; now: string }
  | { type: 'architect/select'; optionId: string }
  | { type: 'architect/confirm' }
  | { type: 'compose/select'; capabilityIds: string[]; now: string }
  | { type: 'compose/configure'; capabilityId: string; now: string }
  | { type: 'compose/deselect'; capabilityId: string }
  | { type: 'compose/workerCreated'; worker: CreatedWorker; now: string }
  | { type: 'compose/compositionFailed'; capabilityId: string; message: string; now: string }
  | { type: 'compose/rejectWorker'; capabilityId: string; now: string }
  | { type: 'compose/reconsider'; capabilityId: string }
  | { type: 'compose/confirm'; now: string }
  | { type: 'generate/patch'; patch: BlueprintPatch; reason: string; now: string }
  | { type: 'generate/rollback'; version: string; now: string }
  | { type: 'generate/confirm' }
  | { type: 'validate/result'; findings: ValidationFinding[]; now: string }
  | { type: 'validate/acknowledge'; findingId: string; now: string }
  | { type: 'publish/done'; appId: string; version: string; now: string }
  | { type: 'architect/message'; message: Omit<ArchitectMessage, 'id'> }

const stageIndex = (stage: StageId) => STAGES.indexOf(stage)

const emptyProgress = (): Record<StageId, StageProgress> =>
  Object.fromEntries(STAGES.map((s) => [s, 'not-started'])) as Record<StageId, StageProgress>

const ALL_SECTIONS: BlueprintSection[] = ['overview', 'requirements', 'solution', 'workflow', 'resources', 'data', 'experience', 'security', 'deployment']

function say(project: StudioProject, stage: StageId, text: string, sources?: string[]): StudioProject {
  const id = `${project.id}-m${project.architectLog.length + 1}`
  return { ...project, architectLog: [...project.architectLog, { id, role: 'architect', stage, text, sources }] }
}

function decide(project: StudioProject, kind: StudioDecision['kind'], text: string, at: string): StudioProject {
  return { ...project, decisions: [...project.decisions, { id: `${project.id}-d${project.decisions.length + 1}`, at, kind, text }] }
}

/** Marks every completed stage after `stage` as needing review, with the reason. */
function invalidateAfter(project: StudioProject, stage: StageId, reason: string): StudioProject {
  const progress = { ...project.progress }
  const staleReasons = { ...project.staleReasons }
  let changed = false
  for (const s of STAGES.slice(stageIndex(stage) + 1)) {
    if (progress[s] === 'complete') {
      progress[s] = 'needs-review'
      staleReasons[s] = reason
      changed = true
    }
  }
  return changed ? { ...project, progress, staleReasons } : project
}

function mark(project: StudioProject, stage: StageId, value: StageProgress): StudioProject {
  const staleReasons = { ...project.staleReasons }
  if (value === 'complete') delete staleReasons[stage]
  return { ...project, progress: { ...project.progress, [stage]: value }, staleReasons }
}

/** A stage the user is editing goes back to needs-review until they confirm it again. */
function reopen(project: StudioProject, stage: StageId, reason: string): StudioProject {
  if (project.progress[stage] !== 'complete') return project
  return { ...project, progress: { ...project.progress, [stage]: 'needs-review' }, staleReasons: { ...project.staleReasons, [stage]: reason } }
}

function validationClear(project: StudioProject): boolean {
  const v = project.validation
  if (!v || !project.blueprint || v.blueprintVersion !== project.blueprint.version) return false
  return v.findings.every((f) => f.status === 'passed' || (f.status === 'needs-review' && v.acknowledged.includes(f.id)))
}

function addRevision(
  project: StudioProject,
  blueprint: ApplicationBlueprint,
  meta: { summary: string; reason: string; kind: NonNullable<BlueprintRevision['kind']>; now: string },
): BlueprintRevision[] {
  const changedSections = project.blueprint ? diffBlueprints(project.blueprint, blueprint).map((d) => d.section) : ALL_SECTIONS
  const revision: BlueprintRevision = {
    version: blueprint.version,
    createdAt: meta.now,
    summary: meta.summary,
    reason: meta.reason,
    kind: meta.kind,
    changedSections,
    snapshot: blueprint,
  }
  return [revision, ...project.revisions].slice(0, MAX_REVISIONS)
}

function nextProjectId(projects: StudioProject[]) {
  const max = projects.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, '')) || 0), 0)
  return `PRJ-${String(max + 1).padStart(3, '0')}`
}

function updateActive(state: StudioState, fn: (p: StudioProject) => StudioProject, now?: string): StudioState {
  return {
    ...state,
    projects: state.projects.map((p) => {
      if (p.id !== state.activeProjectId) return p
      const next = fn(p)
      return next === p ? p : { ...next, updatedAt: now ?? new Date().toISOString() }
    }),
  }
}

const selectedOptionOf = (p: StudioProject) => p.architecture?.options.find((o) => o.id === p.architecture?.selectedOptionId)

/** Recompute coverage after a change to created workers, keeping existing selections. */
function remap(p: StudioProject, createdWorkers: CreatedWorker[]): StudioProject {
  const scenario = getScenario(p.scenarioId)
  const option = selectedOptionOf(p)
  if (!scenario || !option || !p.composition) return p
  return {
    ...p,
    composition: { ...p.composition, createdWorkers, mappings: mapCapabilities(scenario, option, createdWorkers, p.composition.mappings) },
  }
}

function setMappingStatus(p: StudioProject, capabilityIds: string[], status: 'selected' | 'available' | 'requires-configuration'): StudioProject {
  if (!p.composition) return p
  return {
    ...p,
    composition: {
      ...p.composition,
      mappings: p.composition.mappings.map((m) => (capabilityIds.includes(m.capabilityId) && m.resource ? { ...m, status } : m)),
    },
  }
}

function projectReducer(project: StudioProject, action: StudioAction): StudioProject {
  const scenario = getScenario(project.scenarioId)
  switch (action.type) {
    case 'project/rename':
      return { ...project, name: action.name }
    case 'stage/go':
      return { ...project, activeStage: action.stage }

    // ── Discover ──────────────────────────────────────────────────────
    case 'discover/reinterpret': {
      let p: StudioProject = {
        ...project,
        scenarioId: action.scenarioId,
        discover: { prompt: action.prompt, domain: action.domain, understanding: action.understanding },
      }
      p = mark(p, 'discover', 'not-started')
      p = invalidateAfter(p, 'discover', 'Your business description was rewritten.')
      return say(p, 'discover', 'I re-read your description. Check that my understanding still matches what you want.')
    }
    case 'discover/update': {
      const p = reopen({ ...project, discover: { ...project.discover, understanding: action.understanding } }, 'discover', 'You edited what the OS understood.')
      return invalidateAfter(p, 'discover', 'The understanding of your request changed.')
    }
    case 'discover/confirm': {
      if (!scenario || !project.discover.understanding) return project
      const requirements = buildRequirements(scenario, project.discover.understanding, project.requirements)
      const strip = (r: RequirementSpec | null) => (r ? JSON.stringify({ ...r, version: 0 }) : '')
      const changed = !!project.requirements && strip(project.requirements) !== strip(requirements)
      let p: StudioProject = { ...project, requirements, activeStage: 'define' }
      p = mark(p, 'discover', 'complete')
      if (changed) {
        p = reopen(p, 'define', 'Requirements were updated from the revised understanding.')
        p = invalidateAfter(p, 'define', 'Requirements changed.')
      }
      if (!project.requirements) {
        p = say(p, 'define', `I organised the understanding into a requirement specification, using the ${scenario.domain} domain pack. Edit anything that is wrong, then confirm it.`, ['Confirmed understanding', `${scenario.label} scenario (scripted)`])
      }
      return p
    }

    // ── Define ────────────────────────────────────────────────────────
    case 'define/update': {
      const p = reopen({ ...project, requirements: action.requirements }, 'define', 'You changed the requirements.')
      return invalidateAfter(p, 'define', 'Requirements changed since this was produced.')
    }
    case 'define/confirm': {
      if (!scenario || !project.requirements) return project
      const wasComplete = project.progress.define === 'complete'
      const requirements = wasComplete ? project.requirements : { ...project.requirements, version: project.requirements.version + (project.architecture ? 1 : 0) }
      const options = buildOptions(scenario, requirements)
      const previous = project.architecture?.selectedOptionId
      const selectedOptionId = options.some((o) => o.id === previous) ? previous! : null
      let p: StudioProject = { ...project, requirements, architecture: { options, selectedOptionId }, activeStage: 'architect' }
      p = mark(p, 'define', 'complete')
      if (!project.architecture) {
        const recommended = options.find((o) => o.recommended)
        p = say(
          p,
          'architect',
          `I designed ${options.length} approaches, each a different way of working.${recommended ? ` I recommend “${recommended.name}”: ${recommended.recommended!.reason}` : ''}`,
          [`Requirement specification v${requirements.version}`, `${scenario.label} approaches (scripted)`],
        )
      }
      return p
    }

    // ── Architect ─────────────────────────────────────────────────────
    case 'architect/select': {
      if (!project.architecture || project.architecture.selectedOptionId === action.optionId) return project
      let p: StudioProject = { ...project, architecture: { ...project.architecture, selectedOptionId: action.optionId } }
      p = reopen(p, 'architect', 'You chose a different approach.')
      return invalidateAfter(p, 'architect', 'A different solution approach was selected.')
    }
    case 'architect/confirm': {
      const option = selectedOptionOf(project)
      if (!scenario || !option) return project
      const createdWorkers = project.composition?.createdWorkers ?? []
      const mappings = mapCapabilities(scenario, option, createdWorkers, project.composition?.mappings ?? [])
      let p: StudioProject = {
        ...project,
        composition: { mappings, createdWorkers, rejected: project.composition?.rejected ?? [], attempts: project.composition?.attempts ?? {} },
        activeStage: 'compose',
      }
      p = mark(p, 'architect', 'complete')
      const gaps = mappings.filter((m) => m.status === 'missing')
      const config = mappings.filter((m) => m.status === 'requires-configuration')
      return say(
        p,
        'compose',
        `I checked existing agents, workers, connectors, services and domain knowledge first. ${mappings.length - gaps.length} of ${mappings.length} needs have a matching resource${config.length ? `, ${config.length} of them needing configuration` : ''}.${gaps.length ? ` ${gaps.map((g) => g.need).join(', ')} ${gaps.length === 1 ? 'is' : 'are'} missing.` : ' Nothing new has to be created.'} Select the resources you want to use.`,
        [`Approach: ${option.name}`, 'Resource catalogue (mock)'],
      )
    }

    // ── Compose ───────────────────────────────────────────────────────
    case 'compose/select': {
      if (!project.composition) return project
      const ids = action.capabilityIds.filter((id) => project.composition!.mappings.some((m) => m.capabilityId === id && m.status === 'available'))
      if (!ids.length) return project
      let p = setMappingStatus(project, ids, 'selected')
      p = invalidateAfter(p, 'compose', 'The resource selection changed.')
      return decide(p, 'resources-selected', `Selected ${ids.length} existing resource${ids.length === 1 ? '' : 's'}`, action.now)
    }
    case 'compose/configure': {
      const m = project.composition?.mappings.find((x) => x.capabilityId === action.capabilityId)
      if (!m || m.status !== 'requires-configuration' || !m.resource) return project
      // One confirmation covers every need the same resource serves.
      const same = project.composition!.mappings.filter((x) => x.resource?.id === m.resource!.id && x.status === 'requires-configuration')
      let p = setMappingStatus(project, same.map((x) => x.capabilityId), 'selected')
      p = invalidateAfter(p, 'compose', 'The resource selection changed.')
      return decide(p, 'configuration-confirmed', `Confirmed the configuration of ${m.resource.name} for ${same.map((x) => x.need).join(', ')}`, action.now)
    }
    case 'compose/deselect': {
      const m = project.composition?.mappings.find((x) => x.capabilityId === action.capabilityId)
      if (!m || m.status !== 'selected' || m.created) return project
      const p = setMappingStatus(project, [action.capabilityId], m.conditional ? 'requires-configuration' : 'available')
      return invalidateAfter(reopen(p, 'compose', 'A resource was deselected.'), 'compose', 'The resource selection changed.')
    }
    case 'compose/workerCreated': {
      if (!project.composition) return project
      const createdWorkers = [...project.composition.createdWorkers.filter((w) => w.capabilityId !== action.worker.capabilityId), action.worker]
      let p = remap(project, createdWorkers)
      p = { ...p, composition: { ...p.composition!, rejected: p.composition!.rejected.filter((c) => c !== action.worker.capabilityId) } }
      p = invalidateAfter(p, 'compose', 'Resources changed.')
      p = decide(p, 'worker-approved', `Approved the simulated composition of ${action.worker.resource.name} ${action.worker.resource.version}`, action.now)
      return say(p, 'compose', `${action.worker.resource.name} ${action.worker.resource.version} passed its simulated validation and is selected for this application. Nothing was created on the AI Workers Platform.`, ['Simulated composition'])
    }
    case 'compose/compositionFailed': {
      if (!project.composition) return project
      const attempts = { ...project.composition.attempts, [action.capabilityId]: (project.composition.attempts[action.capabilityId] ?? 0) + 1 }
      const p = { ...project, composition: { ...project.composition, attempts } }
      return decide(p, 'composition-failed', `Simulated composition of ${proposalFor(action.capabilityId)?.name ?? action.capabilityId} failed validation: ${action.message}`, action.now)
    }
    case 'compose/rejectWorker': {
      if (!project.composition) return project
      const p = { ...project, composition: { ...project.composition, rejected: [...new Set([...project.composition.rejected, action.capabilityId])] } }
      return decide(p, 'worker-rejected', `Rejected the proposed ${proposalFor(action.capabilityId)?.name ?? 'worker'}`, action.now)
    }
    case 'compose/reconsider': {
      if (!project.composition) return project
      return { ...project, composition: { ...project.composition, rejected: project.composition.rejected.filter((c) => c !== action.capabilityId) } }
    }
    case 'compose/confirm': {
      const option = selectedOptionOf(project)
      if (!scenario || !option || !project.composition || !project.requirements) return project
      if (project.composition.mappings.some((m) => m.status !== 'selected')) return project
      const blueprint = generateBlueprint({
        projectId: project.id,
        name: project.name,
        scenario,
        requirements: project.requirements,
        option,
        mappings: project.composition.mappings,
        previous: project.blueprint,
      })
      const regenerating = Boolean(project.blueprint)
      let p: StudioProject = {
        ...project,
        blueprint,
        revisions: addRevision(project, blueprint, {
          summary: regenerating ? `Regenerated from ${option.name}` : `Generated from ${option.name}`,
          reason: regenerating ? (project.staleReasons.generate ?? 'Upstream decisions were confirmed again.') : 'First blueprint for this application.',
          kind: regenerating ? 'regenerated' : 'generated',
          now: action.now,
        }),
        activeStage: 'generate',
      }
      p = mark(p, 'compose', 'complete')
      p = mark(p, 'generate', 'not-started')
      p = invalidateAfter(p, 'generate', `Blueprint regenerated as ${blueprint.version}.`)
      return say(p, 'generate', `Blueprint ${blueprint.version} is ready: ${blueprint.workflow.nodes.length} workflow steps, ${blueprint.experience.pages.length} screens and ${blueprint.security.roles.length} roles.`, [`Approach: ${option.name}`, 'Selected resources'])
    }

    // ── Generate ──────────────────────────────────────────────────────
    case 'generate/patch': {
      if (!project.blueprint) return project
      const blueprint = applyPatch(project.blueprint, action.patch)
      const p: StudioProject = {
        ...project,
        blueprint,
        revisions: addRevision(project, blueprint, { summary: describePatch(project.blueprint, action.patch), reason: action.reason, kind: 'edit', now: action.now }),
      }
      return invalidateAfter(p, 'generate', `Blueprint changed to ${blueprint.version}.`)
    }
    case 'generate/rollback': {
      const target = project.revisions.find((r) => r.version === action.version && r.snapshot)
      if (!project.blueprint || !target?.snapshot) return project
      const blueprint: ApplicationBlueprint = { ...target.snapshot, name: project.name, status: 'draft', version: bumpVersion(project.blueprint.version, 'patch') }
      let p: StudioProject = {
        ...project,
        blueprint,
        revisions: addRevision(project, blueprint, { summary: `Restored the content of v${target.version}`, reason: 'Rolled back by you.', kind: 'rollback', now: action.now }),
      }
      p = reopen(p, 'generate', `You restored v${target.version} as v${blueprint.version}. Review it and continue.`)
      p = invalidateAfter(p, 'generate', `Blueprint restored from v${target.version}.`)
      return decide(p, 'rollback', `Restored blueprint v${target.version} as draft v${blueprint.version}`, action.now)
    }
    case 'generate/confirm': {
      if (!project.blueprint) return project
      return mark({ ...project, activeStage: 'validate' }, 'generate', 'complete')
    }

    // ── Validate ──────────────────────────────────────────────────────
    case 'validate/result': {
      if (!project.blueprint) return project
      const previouslyAcknowledged = project.validation?.acknowledged ?? []
      const blocked = action.findings.filter((f) => f.status === 'blocked').length
      const review = action.findings.filter((f) => f.status === 'needs-review').length
      let p: StudioProject = {
        ...project,
        validation: {
          ranAt: action.now,
          blueprintVersion: project.blueprint.version,
          findings: action.findings,
          acknowledged: previouslyAcknowledged.filter((id) => action.findings.some((f) => f.id === id && f.status === 'needs-review')),
        },
        validationRuns: [...project.validationRuns, { ranAt: action.now, version: project.blueprint.version, blocked, review }],
      }
      p = mark(p, 'validate', validationClear(p) ? 'complete' : 'not-started')
      p = { ...p, blueprint: { ...p.blueprint!, status: p.progress.validate === 'complete' ? 'validated' : 'draft' } }
      return say(
        p,
        'validate',
        blocked || review
          ? `Validation found ${blocked} blocking issue${blocked === 1 ? '' : 's'} and ${review} to review. Each one says why it matters and where to fix it.`
          : 'Every check passed. The application is ready to publish.',
        [`Blueprint v${project.blueprint.version}`],
      )
    }
    case 'validate/acknowledge': {
      if (!project.validation) return project
      const finding = project.validation.findings.find((f) => f.id === action.findingId)
      let p: StudioProject = { ...project, validation: { ...project.validation, acknowledged: [...project.validation.acknowledged, action.findingId] } }
      p = mark(p, 'validate', validationClear(p) ? 'complete' : 'not-started')
      if (p.progress.validate === 'complete') p = { ...p, blueprint: { ...p.blueprint!, status: 'validated' } }
      return decide(p, 'gap-accepted', `Accepted a known gap for v${project.validation.blueprintVersion}: ${finding?.title ?? action.findingId}`, action.now)
    }

    // ── Publish ───────────────────────────────────────────────────────
    case 'publish/done': {
      if (!project.blueprint) return project
      let p: StudioProject = {
        ...project,
        blueprint: { ...project.blueprint, status: 'published' },
        publication: { appId: action.appId, version: action.version, publishedAt: action.now },
        publications: [...project.publications, { version: action.version, publishedAt: action.now }],
      }
      p = mark(p, 'publish', 'complete')
      p = decide(p, 'published', `Published v${action.version} to the desktop (simulated deployment)`, action.now)
      return say(p, 'publish', `${project.name} ${action.version} is published to the desktop. Future changes stay in this draft until you publish again.`)
    }

    case 'architect/message':
      return { ...project, architectLog: [...project.architectLog, { ...action.message, id: `${project.id}-m${project.architectLog.length + 1}` }] }

    default:
      return project
  }
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'project/create': {
      const id = nextProjectId(state.projects)
      let project: StudioProject = {
        id,
        name: action.name,
        scenarioId: action.scenarioId,
        createdAt: action.now,
        updatedAt: action.now,
        activeStage: 'discover',
        progress: emptyProgress(),
        staleReasons: {},
        discover: { prompt: action.prompt, domain: action.domain, understanding: action.understanding },
        requirements: null,
        architecture: null,
        composition: null,
        blueprint: null,
        revisions: [],
        validation: null,
        validationRuns: [],
        publication: null,
        publications: [],
        decisions: [],
        architectLog: [],
      }
      project = say(project, 'discover', `${action.understanding.summary} Check each group below — edit or remove anything that is wrong, and answer the questions if you can.`, [
        'Your description',
        `${getScenario(action.scenarioId)?.label ?? ''} scenario (scripted)`,
      ])
      return { projects: [project, ...state.projects], activeProjectId: id }
    }
    case 'project/open':
      return state.projects.some((p) => p.id === action.id) ? { ...state, activeProjectId: action.id } : state
    case 'project/close':
      return { ...state, activeProjectId: null }
    case 'project/delete':
      return {
        projects: state.projects.filter((p) => p.id !== action.id),
        activeProjectId: state.activeProjectId === action.id ? null : state.activeProjectId,
      }
    default: {
      const now = 'now' in action ? action.now : undefined
      return updateActive(state, (p) => projectReducer(p, action), now)
    }
  }
}
