/**
 * Runtime model — one shared, strongly typed model for everything that happens after an
 * application is published: transactions, executions, steps, approvals, audit events,
 * outcomes, learning signals, improvement proposals and blueprint changes.
 *
 * Every record is SIMULATED in the browser. Relationships use stable ids:
 *   application ─< execution ─< step
 *   execution ── transaction (1) · approvals (0..n) · audit events (n) · outcome (0..1) · signals (0..n)
 *   proposal ─> signals (1..n) · application · blueprint section · patch
 */

import type { BlueprintPatch } from '@/app/blueprint/generate'
import type { ApplicationBlueprint, ResourceKind, StepActor } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import type { BlueprintSection, ValidationFinding } from '@/app/studio/types'

// ── Transactions ────────────────────────────────────────────────────────

export interface Transaction {
  /** Business reference, e.g. CLM-24-2001. Unique across the runtime. */
  id: string
  kind: string
  label: string
  fields: Record<string, string>
  documents: string[]
  submittedBy: string
}

// ── Executions ──────────────────────────────────────────────────────────

/** Draft is the unsaved form; everything from Queued on is a stored execution. */
export type ExecutionStatus = 'queued' | 'running' | 'paused' | 'waiting-approval' | 'completed' | 'failed' | 'cancelled'

export type StepStatus = 'waiting' | 'running' | 'completed' | 'skipped' | 'failed' | 'awaiting-approval' | 'cancelled'

export interface StepResource {
  id: string
  name: string
  kind: ResourceKind | 'person'
  owner: string
  version: string
}

export interface StepError {
  what: string
  impact: string
  nextAction: string
  retryable: boolean
}

export interface ExecutionStep {
  id: string
  nodeId: string
  name: string
  description: string
  actor: StepActor
  capabilityId: string
  resource: StepResource | null
  status: StepStatus
  startedAt?: string
  endedAt?: string
  /** What the step received, in business terms. */
  input?: string
  /** What the step produced, in business terms. */
  output?: string
  evidence: string[]
  /** Why the next step was triggered (or why this one was skipped). Observable, not model reasoning. */
  explanation?: string
  error?: StepError
  attempts: number
  approvalId?: string
  /** Simulated processing: when the running step finishes (epoch ms). */
  dueAt?: number
}

export interface Execution {
  id: string
  appId: string
  appName: string
  domain: DomainId
  /** Blueprint version the execution ran on (traceability to improvements). */
  blueprintVersion: string
  transaction: Transaction
  status: ExecutionStatus
  steps: ExecutionStep[]
  /** Index of the step in progress (or where execution stopped). */
  current: number
  submittedAt: string
  startedAt?: string
  endedAt?: string
  /** Remaining processing time captured when paused (ms). */
  pausedRemainingMs?: number
  /** Status before pausing, to resume into. */
  pausedFrom?: ExecutionStatus
  /** Values produced by steps and read by later steps and rules (risk, decision, …). */
  vars: Record<string, string>
  approvalIds: string[]
  outcomeId?: string
  /** Seeded history vs. submitted in this browser. */
  origin: 'seed' | 'user'
  /** Queued executions start at this time (epoch ms). */
  startAt?: number
}

// ── Approvals ───────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'info-requested' | 'approved' | 'rejected' | 'withdrawn'

export interface ApprovalRecommendation {
  decision: string
  explanation: string
  evidence: string[]
  policy: string
  attention: string[]
}

export interface ApprovalHistoryEntry {
  at: string
  actor: string
  action: string
  comment?: string
}

export interface Approval {
  id: string
  executionId: string
  appId: string
  stepId: string
  transactionId: string
  /** e.g. "High-value claim". From the workflow configuration's approval rules. */
  type: string
  ruleIds: string[]
  reasons: string[]
  reviewer: string
  priority: 'high' | 'normal'
  status: ApprovalStatus
  submittedAt: string
  decidedAt?: string
  comment?: string
  recommendation: ApprovalRecommendation
  history: ApprovalHistoryEntry[]
}

// ── Audit (also the event stream) ───────────────────────────────────────

export type ActorType = 'user' | 'system' | 'agent' | 'worker' | 'service' | 'connector' | 'person'

export type AuditCategory = 'execution' | 'step' | 'approval' | 'outcome' | 'learning' | 'blueprint' | 'publication'

export interface AuditEvent {
  id: string
  at: string
  actor: string
  actorType: ActorType
  appId: string
  executionId?: string
  category: AuditCategory
  action: string
  description: string
  resourceId?: string
  approvalId?: string
  proposalId?: string
  signalId?: string
  previousState?: string
  newState?: string
}

// ── Outcomes ────────────────────────────────────────────────────────────

export interface Outcome {
  id: string
  executionId: string
  appId: string
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  reason: string
  evidence: string[]
  humanIntervention?: string
  completedAt: string
}

// ── Learning ────────────────────────────────────────────────────────────

export type SignalType =
  | 'failed-execution'
  | 'repeated-exception'
  | 'human-correction'
  | 'approval-rejected'
  | 'missing-information'
  | 'resource-unavailable'
  | 'bottleneck'
  | 'outcome-feedback'

export interface LearningSignal {
  id: string
  appId: string
  executionId: string
  nodeId: string
  capabilityId: string
  stepName: string
  resourceId?: string
  type: SignalType
  /** Groups signals that describe the same thing (app · step · type). */
  themeKey: string
  description: string
  evidence: string[]
  at: string
}

export type ProposalStatus = 'open' | 'accepted' | 'rejected' | 'deferred'

/** Blueprint changes a proposal can make. Applied to a new draft version, never to the published one. */
export type ImprovementPatch = Extract<BlueprintPatch, { kind: 'insert-step' }>

export interface ImprovementProposal {
  id: string
  appId: string
  ruleId: string
  title: string
  problem: string
  signalIds: string[]
  proposedChange: string
  section: BlueprintSection
  expectedEffect: string
  risk: string
  status: ProposalStatus
  createdAt: string
  decidedAt?: string
  decisionNote?: string
  patch: ImprovementPatch
  /** Draft version created when accepted. */
  draftVersion?: string
  publishedVersion?: string
}

// ── Blueprint changes for built-in applications ────────────────────────

/** Built-in applications keep their blueprint here; Studio apps keep theirs in Studio projects. */
export interface BuiltinBlueprintState {
  published: { version: string; blueprint: ApplicationBlueprint; publishedAt: string }
  draft: {
    blueprint: ApplicationBlueprint
    baseVersion: string
    proposalId: string
    createdAt: string
    validation?: { ranAt: string; findings: ValidationFinding[] }
  } | null
  history: { version: string; at: string; summary: string; proposalId?: string; publishedAt?: string }[]
}

// ── Runtime application view ────────────────────────────────────────────

export interface RuntimeApp {
  appId: string
  name: string
  domain: DomainId
  version: string
  blueprint: ApplicationBlueprint
  source: 'builtin' | 'studio'
  projectId?: string
}

export interface RuntimeState {
  version: 1
  /** Per-prefix id counters, so ids are stable and readable (EXE-1001, APR-2001, …). */
  counters: Record<string, number>
  executions: Execution[]
  approvals: Approval[]
  audit: AuditEvent[]
  outcomes: Outcome[]
  signals: LearningSignal[]
  proposals: ImprovementProposal[]
  builtin: Record<string, BuiltinBlueprintState>
}
