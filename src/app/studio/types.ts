import type {
  ApplicationBlueprint,
  DataEntity,
  EvaluationCase,
  ExperiencePage,
  FlowStep,
  RequirementSpec,
  ResourceKind,
  SampleRecord,
  SolutionOption,
  SpecItem,
} from '@/app/blueprint/types'
import type { AppTint, DomainId } from '@/app/registry/types'
import type { GeneratedIconKey } from '@/app/registry/applicationRegistry'
import type { CatalogueResource } from '@/data/studio-resources.mock'

// ── Scenario fixtures (deterministic mock intelligence) ──────────────────

export type SpecListKey = 'users' | 'capabilities' | 'inputs' | 'outputs' | 'constraints' | 'successCriteria'

export interface ScenarioStep extends FlowStep {
  /** Include this step only when the requirement spec contains this capability. */
  requires?: string
}

export interface ScenarioOption extends Omit<SolutionOption, 'steps'> {
  steps: ScenarioStep[]
}

export interface StudioScenario {
  id: string
  domain: DomainId
  label: string
  defaultName: string
  description: string
  iconKey: GeneratedIconKey
  tint: AppTint
  examplePrompt: string
  domainKeywords: string[]
  interpretation: { id: string; text: string; capabilityIds: string[]; keywords?: string[] }[]
  objective: string
  users: SpecItem[]
  capabilities: SpecItem[]
  inputs: SpecItem[]
  outputs: SpecItem[]
  constraints: SpecItem[]
  successCriteria: SpecItem[]
  suggestions: { id: string; list: SpecListKey; item: SpecItem; reason: string }[]
  options: ScenarioOption[]
  /** Business names for capabilities that only appear in flows / supporting needs. */
  capabilityLabels: Record<string, string>
  contracts: Record<string, { inputs: string[]; outputs: string[] }>
  entity: DataEntity
  pages: (ExperiencePage & { requires?: string })[]
  sampleRecords: SampleRecord[]
  evaluations: EvaluationCase[]
}

// ── Project state ─────────────────────────────────────────────────────────

export const STAGES = ['discover', 'define', 'architect', 'compose', 'generate', 'validate', 'publish'] as const
export type StageId = (typeof STAGES)[number]

/** Persisted per-stage progress. "Current" is derived from the active stage. */
export type StageProgress = 'not-started' | 'complete' | 'needs-review'

export interface InterpretationItem {
  id: string
  text: string
  capabilityIds: string[]
  source: 'os' | 'user'
}

export type MappingStatus = 'available' | 'restricted' | 'missing' | 'created'

export interface CapabilityMapping {
  id: string
  capabilityId: string
  need: string
  category: ResourceKind
  stepIds: string[]
  resource: CatalogueResource | null
  status: MappingStatus
}

export interface CreatedWorker {
  capabilityId: string
  resource: CatalogueResource
  createdAt: string
}

export type FindingStatus = 'passed' | 'needs-review' | 'blocked'

export type FindingCategory =
  | 'requirements'
  | 'capabilities'
  | 'compatibility'
  | 'workflow'
  | 'data-contract'
  | 'security'
  | 'ui-data'
  | 'approvals'

export type QuickFix =
  | { kind: 'assign-role'; nodeId: string; candidates: { id: string; label: string }[] }
  | { kind: 'add-field'; entityId: string; fieldId: string; label: string }

export interface ValidationFinding {
  id: string
  category: FindingCategory
  status: FindingStatus
  title: string
  explanation: string
  artifact: { stage: StageId; label: string; tab?: string }
  resolution?: string
  quickFix?: QuickFix
}

export interface BlueprintRevision {
  version: string
  createdAt: string
  summary: string
}

export interface ArchitectMessage {
  id: string
  role: 'architect' | 'user'
  stage: StageId
  text: string
}

export interface StudioProject {
  id: string
  name: string
  scenarioId: string | null
  createdAt: string
  updatedAt: string
  activeStage: StageId
  progress: Record<StageId, StageProgress>
  /** Why a stage needs review — shown as a banner on that stage. */
  staleReasons: Partial<Record<StageId, string>>
  discover: { prompt: string; domain: DomainId | null; interpretation: InterpretationItem[] | null }
  requirements: RequirementSpec | null
  architecture: { options: SolutionOption[]; selectedOptionId: string | null } | null
  composition: { mappings: CapabilityMapping[]; createdWorkers: CreatedWorker[] } | null
  blueprint: ApplicationBlueprint | null
  revisions: BlueprintRevision[]
  validation: { ranAt: string; blueprintVersion: string; findings: ValidationFinding[]; acknowledged: string[] } | null
  publication: { appId: string; version: string; publishedAt: string } | null
  architectLog: ArchitectMessage[]
}

export type Lifecycle = 'discovery' | 'draft' | 'ready' | 'published' | 'changes-pending'
