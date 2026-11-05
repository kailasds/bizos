import { applyPatch, describePatch, generateBlueprint, type BlueprintPatch } from '@/app/blueprint/generate'
import type { RequirementSpec } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import { getScenario } from '@/data/studio-scenarios.mock'
import { buildOptions, buildRequirements, mapCapabilities } from './services/intelligence'
import {
  STAGES,
  type ArchitectMessage,
  type CreatedWorker,
  type InterpretationItem,
  type Lifecycle,
  type StageId,
  type StageProgress,
  type StudioProject,
  type ValidationFinding,
} from './types'

export interface StudioState {
  projects: StudioProject[]
  activeProjectId: string | null
}

export const initialStudioState: StudioState = { projects: [], activeProjectId: null }

export type StudioAction =
  | { type: 'project/create'; prompt: string; domain: DomainId; scenarioId: string; name: string; interpretation: InterpretationItem[]; now: string }
  | { type: 'project/open'; id: string }
  | { type: 'project/close' }
  | { type: 'project/delete'; id: string }
  | { type: 'project/rename'; name: string }
  | { type: 'stage/go'; stage: StageId }
  | { type: 'discover/reinterpret'; prompt: string; domain: DomainId; scenarioId: string; interpretation: InterpretationItem[] }
  | { type: 'discover/edit'; interpretation: InterpretationItem[] }
  | { type: 'discover/confirm' }
  | { type: 'define/update'; requirements: RequirementSpec }
  | { type: 'define/confirm'; now: string }
  | { type: 'architect/select'; optionId: string }
  | { type: 'architect/confirm' }
  | { type: 'compose/workerCreated'; worker: CreatedWorker }
  | { type: 'compose/confirm'; now: string }
  | { type: 'generate/patch'; patch: BlueprintPatch; now: string }
  | { type: 'generate/confirm' }
  | { type: 'validate/result'; findings: ValidationFinding[]; now: string }
  | { type: 'validate/acknowledge'; findingId: string }
  | { type: 'publish/done'; appId: string; version: string; now: string }
  | { type: 'architect/message'; message: Omit<ArchitectMessage, 'id'> }

const stageIndex = (stage: StageId) => STAGES.indexOf(stage)

const emptyProgress = (): Record<StageId, StageProgress> =>
  Object.fromEntries(STAGES.map((s) => [s, 'not-started'])) as Record<StageId, StageProgress>

function say(project: StudioProject, stage: StageId, text: string): StudioProject {
  const id = `${project.id}-m${project.architectLog.length + 1}`
  return { ...project, architectLog: [...project.architectLog, { id, role: 'architect', stage, text }] }
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

function projectReducer(project: StudioProject, action: StudioAction): StudioProject {
  const scenario = getScenario(project.scenarioId)
  switch (action.type) {
    case 'project/rename':
      return { ...project, name: action.name }
    case 'stage/go':
      return { ...project, activeStage: action.stage }

    case 'discover/reinterpret': {
      let p: StudioProject = {
        ...project,
        scenarioId: action.scenarioId,
        discover: { prompt: action.prompt, domain: action.domain, interpretation: action.interpretation },
      }
      p = mark(p, 'discover', 'not-started')
      p = invalidateAfter(p, 'discover', 'Your business description was rewritten.')
      return say(p, 'discover', 'I re-read your description. Check that my interpretation still matches what you want.')
    }
    case 'discover/edit': {
      const p = reopen({ ...project, discover: { ...project.discover, interpretation: action.interpretation } }, 'discover', 'You edited the interpretation.')
      return invalidateAfter(p, 'discover', 'The interpretation of your request changed.')
    }
    case 'discover/confirm': {
      if (!scenario || !project.discover.interpretation) return project
      const requirements = buildRequirements(scenario, project.discover.interpretation, project.requirements)
      const capsChanged =
        !!project.requirements &&
        JSON.stringify(project.requirements.capabilities) !== JSON.stringify(requirements.capabilities)
      let p: StudioProject = { ...project, requirements, activeStage: 'define' }
      p = mark(p, 'discover', 'complete')
      if (capsChanged) {
        p = reopen(p, 'define', 'Capabilities changed because the interpretation changed.')
        p = invalidateAfter(p, 'define', 'Requirements changed.')
      }
      if (!project.requirements) {
        p = say(p, 'define', `I drafted a requirement specification from your description and the ${scenario.domain} domain pack. Edit anything that is wrong, then confirm it.`)
      }
      return p
    }

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
        p = say(p, 'architect', `I designed ${options.length} approaches with different levels of automation.${recommended ? ` I recommend “${recommended.name}”: ${recommended.recommended!.reason}` : ''}`)
      }
      return p
    }

    case 'architect/select': {
      if (!project.architecture || project.architecture.selectedOptionId === action.optionId) return project
      let p: StudioProject = { ...project, architecture: { ...project.architecture, selectedOptionId: action.optionId } }
      p = reopen(p, 'architect', 'You chose a different approach.')
      return invalidateAfter(p, 'architect', 'A different solution approach was selected.')
    }
    case 'architect/confirm': {
      const option = project.architecture?.options.find((o) => o.id === project.architecture?.selectedOptionId)
      if (!scenario || !option) return project
      const createdWorkers = project.composition?.createdWorkers ?? []
      const mappings = mapCapabilities(scenario, option, createdWorkers)
      let p: StudioProject = { ...project, composition: { mappings, createdWorkers }, activeStage: 'compose' }
      p = mark(p, 'architect', 'complete')
      const gaps = mappings.filter((m) => m.status === 'missing')
      return say(
        p,
        'compose',
        gaps.length
          ? `I checked existing agents, workers, connectors and domain knowledge first. ${mappings.length - gaps.length} needs are covered by existing resources; ${gaps.map((g) => g.need).join(', ')} ${gaps.length === 1 ? 'is' : 'are'} missing.`
          : `Every need is covered by an existing resource, so nothing new has to be created.`,
      )
    }

    case 'compose/workerCreated': {
      const option = project.architecture?.options.find((o) => o.id === project.architecture?.selectedOptionId)
      if (!scenario || !option || !project.composition) return project
      const createdWorkers = [...project.composition.createdWorkers.filter((w) => w.capabilityId !== action.worker.capabilityId), action.worker]
      let p: StudioProject = { ...project, composition: { mappings: mapCapabilities(scenario, option, createdWorkers), createdWorkers } }
      p = invalidateAfter(p, 'compose', 'Resources changed.')
      return say(p, 'compose', `${action.worker.resource.name} ${action.worker.resource.version} passed validation and is now available to this application.`)
    }
    case 'compose/confirm': {
      const option = project.architecture?.options.find((o) => o.id === project.architecture?.selectedOptionId)
      if (!scenario || !option || !project.composition || !project.requirements) return project
      if (project.composition.mappings.some((m) => m.status === 'missing')) return project
      const blueprint = generateBlueprint({
        projectId: project.id,
        name: project.name,
        scenario,
        requirements: project.requirements,
        option,
        mappings: project.composition.mappings,
        previous: project.blueprint,
      })
      let p: StudioProject = {
        ...project,
        blueprint,
        revisions: [
          { version: blueprint.version, createdAt: action.now, summary: project.blueprint ? `Regenerated from ${option.name}` : `Generated from ${option.name}` },
          ...project.revisions,
        ],
        activeStage: 'generate',
      }
      p = mark(p, 'compose', 'complete')
      p = mark(p, 'generate', 'not-started')
      p = invalidateAfter(p, 'generate', `Blueprint regenerated as ${blueprint.version}.`)
      return say(p, 'generate', `Blueprint ${blueprint.version} is ready: ${blueprint.workflow.nodes.length} workflow steps, ${blueprint.experience.pages.length} screens and ${blueprint.security.roles.length} roles.`)
    }

    case 'generate/patch': {
      if (!project.blueprint) return project
      const blueprint = applyPatch(project.blueprint, action.patch)
      let p: StudioProject = {
        ...project,
        blueprint,
        revisions: [{ version: blueprint.version, createdAt: action.now, summary: describePatch(project.blueprint, action.patch) }, ...project.revisions],
      }
      p = invalidateAfter(p, 'generate', `Blueprint changed to ${blueprint.version}.`)
      return p
    }
    case 'generate/confirm': {
      if (!project.blueprint) return project
      return mark({ ...project, activeStage: 'validate' }, 'generate', 'complete')
    }

    case 'validate/result': {
      if (!project.blueprint) return project
      const previouslyAcknowledged = project.validation?.acknowledged ?? []
      let p: StudioProject = {
        ...project,
        validation: {
          ranAt: action.now,
          blueprintVersion: project.blueprint.version,
          findings: action.findings,
          acknowledged: previouslyAcknowledged.filter((id) => action.findings.some((f) => f.id === id && f.status === 'needs-review')),
        },
      }
      p = mark(p, 'validate', validationClear(p) ? 'complete' : 'not-started')
      p = { ...p, blueprint: { ...p.blueprint!, status: p.progress.validate === 'complete' ? 'validated' : 'draft' } }
      const blocked = action.findings.filter((f) => f.status === 'blocked').length
      const review = action.findings.filter((f) => f.status === 'needs-review').length
      return say(
        p,
        'validate',
        blocked || review
          ? `Validation found ${blocked} blocking issue${blocked === 1 ? '' : 's'} and ${review} to review. Each one links to where it can be fixed.`
          : 'Every check passed. The application is ready to publish.',
      )
    }
    case 'validate/acknowledge': {
      if (!project.validation) return project
      let p: StudioProject = { ...project, validation: { ...project.validation, acknowledged: [...project.validation.acknowledged, action.findingId] } }
      p = mark(p, 'validate', validationClear(p) ? 'complete' : 'not-started')
      if (p.progress.validate === 'complete') p = { ...p, blueprint: { ...p.blueprint!, status: 'validated' } }
      return p
    }

    case 'publish/done': {
      if (!project.blueprint) return project
      let p: StudioProject = {
        ...project,
        blueprint: { ...project.blueprint, status: 'published' },
        publication: { appId: action.appId, version: action.version, publishedAt: action.now },
      }
      p = mark(p, 'publish', 'complete')
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
        discover: { prompt: action.prompt, domain: action.domain, interpretation: action.interpretation },
        requirements: null,
        architecture: null,
        composition: null,
        blueprint: null,
        revisions: [],
        validation: null,
        publication: null,
        architectLog: [],
      }
      const scenario = getScenario(action.scenarioId)
      project = say(project, 'discover', `This reads as ${scenario?.label.toLowerCase() ?? 'a business'} problem in ${action.domain}. Here is what I understood — correct anything that is wrong before I draft requirements.`)
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

export function lifecycleOf(project: StudioProject): Lifecycle {
  if (project.publication) {
    return project.progress.publish === 'complete' && project.blueprint?.version === project.publication.version
      ? 'published'
      : 'changes-pending'
  }
  if (project.progress.validate === 'complete') return 'ready'
  return project.progress.discover === 'complete' ? 'draft' : 'discovery'
}

export const lifecycleLabel: Record<Lifecycle, string> = {
  discovery: 'Discovery',
  draft: 'Draft',
  ready: 'Ready to publish',
  published: 'Published',
  'changes-pending': 'Published · changes pending',
}
