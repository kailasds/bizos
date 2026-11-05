/**
 * Application Blueprint — the versioned source of truth for a generated application
 * (context.md §5 Layer 5, §7). Everything downstream (validation, preview, publication,
 * the runtime window) reads this structure. Schema version 0.1 — prototype, not final.
 */

import type { DomainId } from '@/app/registry/types'

export type BlueprintStatus = 'draft' | 'validated' | 'published'

/** Who performs a workflow step, in business terms. */
export type StepActor = 'automated' | 'human' | 'system'

export type ResourceKind = 'agent' | 'worker' | 'connector' | 'knowledge' | 'service'

export type ResourceOwner =
  | 'Agent Control Plane'
  | 'AI Workers Platform'
  | 'Integration infrastructure'
  | 'Domain Intelligence Kernel'
  | 'Enterprise AI OS'

export interface SpecItem {
  id: string
  label: string
  description?: string
  /** Links a capability requirement to the capability catalogue. Absent for user-added items. */
  capabilityId?: string
}

export interface RequirementSpec {
  /** Increments each time the user confirms a changed specification. */
  version: number
  objective: string
  users: SpecItem[]
  capabilities: SpecItem[]
  inputs: SpecItem[]
  outputs: SpecItem[]
  constraints: SpecItem[]
  successCriteria: SpecItem[]
}

export type AutomationLevel = 'assisted' | 'balanced' | 'extensive'

export interface FlowStep {
  id: string
  name: string
  actor: StepActor
  capabilityId: string
  /** Human steps: the role that performs or approves it. `null` = not yet decided. */
  role?: string | null
  roleCandidates?: string[]
}

export interface SolutionOption {
  id: string
  name: string
  tagline: string
  summary: string
  automation: AutomationLevel
  steps: FlowStep[]
  /** Capabilities that need a resource beyond the flow steps (e.g. system access). */
  supportingCapabilities: string[]
  humanReview: string[]
  benefits: string[]
  tradeOffs: string[]
  dependencies: string[]
  recommended?: { reason: string }
}

export interface ResourceRef {
  id: string
  name: string
  version: string
  kind: ResourceKind
  owner: ResourceOwner
  capabilityIds: string[]
  /** `created` = composed for this application during Compose. */
  origin: 'existing' | 'created'
}

export interface WorkflowNode {
  id: string
  name: string
  actor: StepActor
  capabilityId: string
  resourceId: string | null
  /** Human steps only. */
  role: string | null
  inputs: string[]
  outputs: string[]
}

export interface WorkflowEdge {
  id: string
  from: string
  to: string
  condition?: string
}

export type FieldType = 'text' | 'longtext' | 'money' | 'date' | 'status' | 'level'

export interface FieldOption {
  value: string
  label: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export interface DataField {
  id: string
  label: string
  type: FieldType
  options?: FieldOption[]
}

export interface DataEntity {
  id: string
  name: string
  pluralName: string
  /** Field used as the record's title. */
  titleField: string
  fields: DataField[]
}

export type ExperienceComponent =
  | { id: string; type: 'work-queue'; title: string; columns: string[]; filter?: { field: string; values: string[] } }
  | { id: string; type: 'record-detail'; fields: string[]; showWorkflow: boolean }
  | { id: string; type: 'intake-form'; title: string; fields: string[] }
  | { id: string; type: 'approval-queue'; title: string; columns: string[]; statusValue: string }
  | { id: string; type: 'notes-panel'; title: string; field: string }

export interface ExperiencePage {
  id: string
  title: string
  purpose: string
  roles: string[]
  components: ExperienceComponent[]
}

export interface Role {
  id: string
  name: string
  permissions: string[]
}

export interface ApprovalRule {
  id: string
  nodeId: string
  description: string
  role: string | null
}

export interface EvaluationCase {
  id: string
  name: string
  given: string
  expect: string
}

export interface ApplicationBlueprint {
  schemaVersion: '0.1'
  applicationId: string
  name: string
  description: string
  domain: DomainId
  domainPack: { id: string; version: string }
  status: BlueprintStatus
  version: string
  requirements: RequirementSpec
  solutionArchitecture: {
    optionId: string
    name: string
    summary: string
    automation: AutomationLevel
    humanCheckpoints: string[]
  }
  workflow: { id: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  resources: {
    agents: ResourceRef[]
    workers: ResourceRef[]
    connectors: ResourceRef[]
    services: ResourceRef[]
    knowledge: ResourceRef[]
  }
  dataModel: { primaryEntity: string; entities: DataEntity[] }
  experience: { designSystem: 'enterprise-light'; componentCatalogue: string; pages: ExperiencePage[] }
  security: { roles: Role[]; approvals: ApprovalRule[]; audit: { decisionLog: boolean; retention: string } }
  evaluations: EvaluationCase[]
  deployment: { target: 'enterprise-ai-os-desktop'; environment: 'prototype'; folder: DomainId; runtime: 'mock-runtime' }
}

export type RecordValue = string | number
export type SampleRecord = Record<string, RecordValue> & { id: string }
