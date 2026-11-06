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
import type { PlatformResource } from '@/data/resources.mock'

// ── Scenario fixtures (deterministic mock intelligence) ──────────────────

export type SpecListKey = 'users' | 'capabilities' | 'inputs' | 'outputs' | 'constraints' | 'successCriteria'

export interface ScenarioStep extends FlowStep {
  /** Include this step only when the requirement spec contains this capability. */
  requires?: string
}

export interface ScenarioOption extends Omit<SolutionOption, 'steps'> {
  steps: ScenarioStep[]
}

/** What a discovery item is about. Items are shown in groups (see UNDERSTANDING_GROUPS). */
export type UnderstandingKind =
  | 'objective'
  | 'problem'
  | 'outcome'
  | 'user'
  | 'process'
  | 'challenge'
  | 'input'
  | 'output'
  | 'integration'
  | 'constraint'
  | 'capability'

export type UnderstandingGroup = 'objective' | 'people' | 'process' | 'information' | 'rules' | 'capabilities'

export type QuestionEffect =
  | { kind: 'none' }
  | { kind: 'approver'; role: string }
  | { kind: 'add'; itemKind: UnderstandingKind; text: string; capabilityIds?: string[] }

export interface ClarificationQuestion {
  id: string
  text: string
  /** Why the OS is asking — shown with the question. */
  why: string
  options: { id: string; label: string; effect: QuestionEffect }[]
}

export interface ScenarioSuggestion {
  id: string
  kind: UnderstandingKind
  text: string
  reason: string
  capabilityIds?: string[]
  /** Spec list the item lands in (for Define). */
  list: SpecListKey
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
  /** "You want …" — base sentence plus clauses added when a capability item is present. */
  summary: { base: string; clauses: Record<string, string> }
  /** Capability items, filtered by keywords in the description. */
  interpretation: { id: string; text: string; capabilityIds: string[]; keywords?: string[] }[]
  objective: string
  problem: string
  users: SpecItem[]
  processes: SpecItem[]
  challenges: SpecItem[]
  integrations: SpecItem[]
  capabilities: SpecItem[]
  inputs: SpecItem[]
  outputs: SpecItem[]
  constraints: SpecItem[]
  successCriteria: SpecItem[]
  /** Item id → words that, when present in the description, make it "from your description". */
  evidence: Record<string, string[]>
  suggestions: ScenarioSuggestion[]
  questions: ClarificationQuestion[]
  options: ScenarioOption[]
  /** Business names for capabilities that only appear in flows / supporting needs. */
  capabilityLabels: Record<string, string>
  contracts: Record<string, { inputs: string[]; outputs: string[] }>
  entity: DataEntity
  pages: (ExperiencePage & { requires?: string })[]
  sampleRecords: SampleRecord[]
  evaluations: EvaluationCase[]
}

// ── Discovery ─────────────────────────────────────────────────────────────

export interface UnderstandingItem {
  id: string
  kind: UnderstandingKind
  text: string
  detail?: string
  /** Where the item came from — shown as a source cue. */
  source: 'description' | 'domain' | 'user' | 'suggestion' | 'answer'
  /** The words in the user's description that support it. */
  quote?: string
  capabilityIds: string[]
}

export interface Understanding {
  scenarioId: string
  summary: string
  /** Phrases from the description that matched the scenario. */
  matchedPhrases: string[]
  items: UnderstandingItem[]
  suggestions: (ScenarioSuggestion & { status: 'pending' | 'accepted' | 'rejected' })[]
  questions: (ClarificationQuestion & { answer: string | null })[]
}

/** Milestone 2 discovery item; kept for migrating older drafts. */
export interface InterpretationItem {
  id: string
  text: string
  capabilityIds: string[]
  source: 'os' | 'user'
}

// ── Project state ─────────────────────────────────────────────────────────

export const STAGES = ['discover', 'define', 'architect', 'compose', 'generate', 'publish'] as const
export type StageId = (typeof STAGES)[number]

/** Persisted per-stage progress. "Current" is derived from the active stage. */
export type StageProgress = 'not-started' | 'complete' | 'needs-review'

/**
 * Coverage status of a required capability:
 * available = an existing resource matches but you have not selected it yet;
 * selected = chosen for this application;
 * requires-configuration = a resource matches but needs a business decision first;
 * missing = nothing matches.
 */
export type MappingStatus = 'available' | 'selected' | 'requires-configuration' | 'missing'

export interface CapabilityMapping {
  id: string
  capabilityId: string
  need: string
  category: ResourceKind
  stepIds: string[]
  resource: PlatformResource | null
  status: MappingStatus
  /** Composed for this application during Compose (simulated). */
  created: boolean
  /** The resource has a condition or configuration requirement. */
  conditional: boolean
}

export interface CreatedWorker {
  capabilityId: string
  resource: PlatformResource
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
  /** Why the issue matters to the business (Milestone 3). */
  impact?: string
  /** True when resolving it needs a decision only the user can make. */
  approvalRequired?: boolean
  artifact: { stage: StageId; label: string; tab?: string }
  resolution?: string
  quickFix?: QuickFix
}

export type BlueprintSection =
  | 'overview'
  | 'requirements'
  | 'solution'
  | 'workflow'
  | 'resources'
  | 'data'
  | 'experience'
  | 'security'
  | 'deployment'

export interface BlueprintRevision {
  version: string
  createdAt: string
  /** What changed. */
  summary: string
  /** Why it changed. */
  reason?: string
  kind?: 'generated' | 'regenerated' | 'edit' | 'rollback'
  changedSections?: BlueprintSection[]
  /** Full blueprint at this version (absent for Milestone 2 revisions). */
  snapshot?: ApplicationBlueprint
}

/** Simulated approval decisions and other choices the user made — the project's audit trail. */
export interface StudioDecision {
  id: string
  at: string
  kind:
    | 'worker-approved'
    | 'worker-rejected'
    | 'composition-failed'
    | 'resources-selected'
    | 'configuration-confirmed'
    | 'gap-accepted'
    | 'rollback'
    | 'published'
  text: string
}

export interface ArchitectAction {
  label: string
  kind: 'go-stage' | 'focus-option'
  stage?: StageId
  optionId?: string
}

export interface ArchitectMessage {
  id: string
  role: 'architect' | 'user'
  stage: StageId
  text: string
  /** What the reply is based on — shown as a subtle source line. */
  sources?: string[]
  actions?: ArchitectAction[]
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
  discover: {
    prompt: string
    domain: DomainId | null
    understanding: Understanding | null
    /** Milestone 2 field; migrated into `understanding` on load. */
    interpretation?: InterpretationItem[] | null
  }
  requirements: RequirementSpec | null
  architecture: { options: SolutionOption[]; selectedOptionId: string | null } | null
  composition: {
    mappings: CapabilityMapping[]
    createdWorkers: CreatedWorker[]
    /** Capabilities whose proposed worker the user rejected. */
    rejected: string[]
    /** Composition attempts per capability (drives the deterministic first-attempt failure). */
    attempts: Record<string, number>
  } | null
  blueprint: ApplicationBlueprint | null
  revisions: BlueprintRevision[]
  validation: { ranAt: string; blueprintVersion: string; findings: ValidationFinding[]; acknowledged: string[] } | null
  validationRuns: { ranAt: string; version: string; blocked: number; review: number }[]
  publication: { appId: string; version: string; publishedAt: string } | null
  publications: { version: string; publishedAt: string }[]
  decisions: StudioDecision[]
  architectLog: ArchitectMessage[]
}

export type Lifecycle = 'draft' | 'designing' | 'validating' | 'ready' | 'published' | 'changes-pending'
