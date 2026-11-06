/**
 * MOCK execution engine. Deterministic state machine over the shared runtime model.
 *
 * Functions mutate a draft RuntimeState (the store clones before calling). Every audit event
 * is written by the transition that caused it — the activity stream is never fabricated
 * separately — and learning signals and improvement proposals are derived from those same
 * transitions.
 */

import type { WorkflowNode } from '@/app/blueprint/types'
import { capabilityLabel } from '@/app/services/mock/capability-analysis-service'
import { scenarioForDomain } from '@/data/studio-scenarios.mock'
import { improvementTemplates, transactionSchemas } from '@/data/runtime.mock'
import { money, runScript, type StepContext } from './scripts'
import type {
  ActorType,
  Approval,
  AuditEvent,
  Execution,
  ExecutionStatus,
  ExecutionStep,
  LearningSignal,
  RuntimeApp,
  RuntimeState,
  SignalType,
  StepResource,
} from './types'
import { approvalRules, communicationCapabilities, outcomeLabels, rejectionHandling } from './workflow-config'

export type ResolveApp = (appId: string) => RuntimeApp | null

const iso = (ms: number) => new Date(ms).toISOString()

const idFormats: Record<string, [number, number]> = {
  EXE: [1000, 4],
  APR: [2000, 4],
  OUT: [3000, 4],
  SIG: [4000, 4],
  IMP: [5000, 4],
  AUD: [0, 6],
}

export function nextId(state: RuntimeState, prefix: keyof typeof idFormats): string {
  const n = (state.counters[prefix] ?? 0) + 1
  state.counters[prefix] = n
  const [base, width] = idFormats[prefix]
  return `${prefix}-${String(base + n).padStart(width, '0')}`
}

export const isTerminal = (s: ExecutionStatus) => s === 'completed' || s === 'failed' || s === 'cancelled'

function audit(state: RuntimeState, e: Omit<AuditEvent, 'id'>) {
  state.audit.push({ id: nextId(state, 'AUD'), ...e })
}

const actorTypeOf = (r: StepResource | null): ActorType =>
  !r ? 'system' : r.kind === 'person' ? 'person' : r.kind === 'agent' ? 'agent' : r.kind === 'worker' ? 'worker' : r.kind === 'connector' ? 'connector' : 'service'

const humanize = (id: string) => id.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

function describeNode(app: RuntimeApp, node: WorkflowNode): string {
  const scenario = scenarioForDomain(app.domain)
  const label = capabilityLabel(scenario, node.capabilityId)
  const what = label === node.capabilityId ? humanize(node.capabilityId) : label
  if (node.actor === 'human') return `A person decides when the workflow’s approval rules apply (${what.toLowerCase()}).`
  return `${node.actor === 'automated' ? 'AI-assisted' : 'Rules-based'} step: ${what.toLowerCase()}.`
}

function resourceFor(app: RuntimeApp, node: WorkflowNode): StepResource | null {
  if (node.actor === 'human') {
    const role = app.blueprint.security.roles.find((r) => r.id === node.role)
    return { id: `role:${node.role ?? 'unassigned'}`, name: role?.name ?? 'Approver to be decided', kind: 'person', owner: 'Your organisation', version: '—' }
  }
  const ref = Object.values(app.blueprint.resources)
    .flat()
    .find((r) => r.id === node.resourceId)
  return ref ? { id: ref.id, name: ref.name, kind: ref.kind, owner: ref.owner, version: ref.version } : null
}

function ctxOf(exec: Execution, attempt: number): StepContext {
  const amountField = transactionSchemas[exec.domain].amountField
  return {
    domain: exec.domain,
    fields: exec.transaction.fields,
    documents: exec.transaction.documents,
    vars: exec.vars,
    attempt,
    amount: amountField ? Number(exec.transaction.fields[amountField]) || 0 : 0,
  }
}

// ── Submission ──────────────────────────────────────────────────────────

export interface TransactionInput {
  fields: Record<string, string>
  documents: string[]
  submittedBy: string
}

export function submitTransaction(state: RuntimeState, app: RuntimeApp, input: TransactionInput, nowMs: number, origin: 'seed' | 'user' = 'user'): Execution {
  const schema = transactionSchemas[app.domain]
  const id = nextId(state, 'EXE')
  const transaction = {
    id: input.fields[schema.idField] || id,
    kind: schema.kind,
    label: input.fields[schema.titleField] || schema.noun,
    fields: input.fields,
    documents: input.documents,
    submittedBy: input.submittedBy,
  }
  const exec: Execution = {
    id,
    appId: app.appId,
    appName: app.name,
    domain: app.domain,
    blueprintVersion: app.version,
    transaction,
    status: 'queued',
    steps: app.blueprint.workflow.nodes.map((n, i) => ({
      id: `${id}-S${i + 1}`,
      nodeId: n.id,
      name: n.name,
      description: describeNode(app, n),
      actor: n.actor,
      capabilityId: n.capabilityId,
      resource: resourceFor(app, n),
      status: 'waiting',
      evidence: [],
      attempts: 0,
    })),
    current: 0,
    submittedAt: iso(nowMs),
    vars: {},
    approvalIds: [],
    origin,
    startAt: nowMs + 700,
  }
  state.executions.push(exec)
  audit(state, { at: iso(nowMs), actor: input.submittedBy, actorType: 'user', appId: app.appId, executionId: id, category: 'execution', action: 'Transaction submitted', description: `${transaction.id} submitted to ${app.name}.`, newState: 'draft' })
  audit(state, { at: iso(nowMs), actor: 'Application Runtime', actorType: 'system', appId: app.appId, executionId: id, category: 'execution', action: 'Execution queued', description: `${id} created for ${transaction.id} on blueprint v${app.version}.`, previousState: 'draft', newState: 'queued' })
  return exec
}

// ── Clock ───────────────────────────────────────────────────────────────

export function needsTick(state: RuntimeState, nowMs: number): boolean {
  return state.executions.some(
    (e) => (e.status === 'queued' && (e.startAt ?? 0) <= nowMs) || (e.status === 'running' && (e.steps[e.current]?.dueAt ?? Infinity) <= nowMs),
  )
}

/** Advances every execution whose next transition is due. Timestamps come from the due times, not the tick. */
export function tick(state: RuntimeState, nowMs: number, resolve: ResolveApp) {
  for (const exec of state.executions) {
    if (exec.status === 'queued' && (exec.startAt ?? 0) <= nowMs) {
      const at = exec.startAt ?? nowMs
      exec.status = 'running'
      exec.startedAt = iso(at)
      delete exec.startAt
      audit(state, { at: iso(at), actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution started', description: `Workflow started with “${exec.steps[0]?.name}”.`, previousState: 'queued', newState: 'running' })
      startStep(state, exec, 0, at, resolve)
    }
    let guard = 0
    while (exec.status === 'running' && guard++ < 50) {
      const step = exec.steps[exec.current]
      if (!step || step.status !== 'running' || (step.dueAt ?? Infinity) > nowMs) break
      finishStep(state, exec, step.dueAt!, resolve)
    }
  }
}

function startStep(state: RuntimeState, exec: Execution, index: number, atMs: number, resolve: ResolveApp) {
  if (index >= exec.steps.length) return completeExecution(state, exec, atMs)
  exec.current = index
  const step = exec.steps[index]
  const at = iso(atMs)

  if (exec.vars.decision === 'rejected' && !communicationCapabilities.includes(step.capabilityId)) {
    return skipStep(state, exec, step, 'Skipped: the request was rejected, so the workflow only informs the customer.', atMs, resolve)
  }

  if (step.actor === 'human') {
    const ctx = ctxOf(exec, 1)
    const matches = approvalRules
      .filter((r) => r.domain === exec.domain)
      .map((r) => ({ rule: r, reason: r.when({ vars: exec.vars, fields: exec.transaction.fields, amount: ctx.amount, capabilityId: step.capabilityId }) }))
      .filter((m): m is { rule: (typeof approvalRules)[number]; reason: string } => Boolean(m.reason))
    if (!matches.length) {
      const conditions = approvalRules.filter((r) => r.domain === exec.domain).map((r) => r.type.toLowerCase())
      return skipStep(state, exec, step, `Not required: none of the approval conditions apply (${conditions.join(', ')}).`, atMs, resolve)
    }
    const approval = createApproval(state, exec, step, matches, atMs)
    step.status = 'awaiting-approval'
    step.startedAt = at
    step.approvalId = approval.id
    step.input = `Approval request ${approval.id}: ${approval.reasons.join(' ')}`
    exec.status = 'waiting-approval'
    audit(state, { at, actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'approval', action: 'Approval requested', description: `${approval.type} — ${approval.id} assigned to ${approval.reviewer}.`, approvalId: approval.id, previousState: 'running', newState: 'waiting-approval' })
    return
  }

  const preview = runScript(step.capabilityId, ctxOf(exec, step.attempts + 1))
  if (preview.skip) return skipStep(state, exec, step, preview.skip, atMs, resolve)
  step.status = 'running'
  step.startedAt = at
  step.endedAt = undefined
  step.attempts += 1
  step.dueAt = atMs + preview.durationMs
  step.input = preview.input
  audit(state, { at, actor: step.resource?.name ?? 'Application Runtime', actorType: actorTypeOf(step.resource), appId: exec.appId, executionId: exec.id, category: 'step', action: `${step.name} started`, description: step.attempts > 1 ? `Attempt ${step.attempts}.` : step.description, resourceId: step.resource?.id, previousState: 'waiting', newState: 'running' })
}

function skipStep(state: RuntimeState, exec: Execution, step: ExecutionStep, reason: string, atMs: number, resolve: ResolveApp) {
  step.status = 'skipped'
  step.explanation = reason
  step.startedAt = iso(atMs)
  step.endedAt = iso(atMs)
  audit(state, { at: iso(atMs), actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'step', action: `${step.name} skipped`, description: reason, resourceId: step.resource?.id, previousState: 'waiting', newState: 'skipped' })
  startStep(state, exec, exec.steps.indexOf(step) + 1, atMs, resolve)
}

function finishStep(state: RuntimeState, exec: Execution, atMs: number, resolve: ResolveApp) {
  const step = exec.steps[exec.current]
  const result = runScript(step.capabilityId, ctxOf(exec, step.attempts))
  const at = iso(atMs)
  step.endedAt = at
  step.dueAt = undefined
  step.input = result.input
  step.evidence = result.evidence
  if (result.fail) {
    const { signal, ...error } = result.fail
    step.status = 'failed'
    step.error = error
    step.output = undefined
    exec.status = 'failed'
    exec.endedAt = at
    audit(state, { at, actor: step.resource?.name ?? 'Application Runtime', actorType: actorTypeOf(step.resource), appId: exec.appId, executionId: exec.id, category: 'step', action: `${step.name} failed`, description: error.what, resourceId: step.resource?.id, previousState: 'running', newState: 'failed' })
    audit(state, { at, actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution failed', description: `Stopped at “${step.name}”. ${error.retryable ? 'Retry is available.' : 'Retry is not available.'}`, previousState: 'running', newState: 'failed' })
    addSignal(state, exec, step, signal ?? 'failed-execution', `${step.name} failed: ${error.what}`, [error.what, ...result.evidence], at, resolve)
    return
  }
  step.status = 'completed'
  step.output = result.output
  step.explanation = result.explanation
  step.error = undefined
  Object.assign(exec.vars, result.vars ?? {})
  audit(state, { at, actor: step.resource?.name ?? 'Application Runtime', actorType: actorTypeOf(step.resource), appId: exec.appId, executionId: exec.id, category: 'step', action: `${step.name} completed`, description: result.output, resourceId: step.resource?.id, previousState: 'running', newState: 'completed' })
  if (result.signal) addSignal(state, exec, step, result.signal.type, result.signal.description, result.signal.evidence, at, resolve)
  startStep(state, exec, exec.current + 1, atMs, resolve)
}

function completeExecution(state: RuntimeState, exec: Execution, atMs: number) {
  const at = iso(atMs)
  exec.status = 'completed'
  exec.endedAt = at
  exec.current = exec.steps.length - 1
  const labels = outcomeLabels[exec.domain]
  const decided = exec.approvalIds.map((id) => state.approvals.find((a) => a.id === id)).filter((a): a is Approval => Boolean(a && (a.status === 'approved' || a.status === 'rejected')))
  const lastDecision = decided[decided.length - 1]
  const rejected = exec.vars.decision === 'rejected'
  const byPerson = exec.vars.decidedBy === 'person'
  const label = rejected ? labels.rejected : byPerson ? labels.approvedByPerson : labels.approvedAutomatically
  const decisionStep = [...exec.steps].reverse().find((s) => s.status === 'completed' && (s.actor === 'human' || /decision|routing/.test(s.capabilityId)))
  const outcome = {
    id: nextId(state, 'OUT'),
    executionId: exec.id,
    appId: exec.appId,
    label,
    tone: (rejected ? 'warning' : 'success') as 'warning' | 'success',
    reason: rejected
      ? `Rejected by ${lastDecision?.history.at(-1)?.actor ?? 'the reviewer'}${lastDecision?.comment ? `: “${lastDecision.comment}”` : '.'}`
      : byPerson
        ? `Approved by ${lastDecision?.history.at(-1)?.actor ?? 'the reviewer'}${lastDecision?.comment ? `: “${lastDecision.comment}”` : '.'}`
        : decisionStep?.output ?? 'Completed by the workflow rules.',
    evidence: exec.steps.filter((s) => s.status === 'completed' && s.actor !== 'human' && s.evidence.length).slice(-3).flatMap((s) => s.evidence.slice(0, 1).map((e) => `${s.name}: ${e}`)),
    humanIntervention: decided.length ? decided.map((a) => `${a.type}: ${a.status} by ${a.history.at(-1)?.actor}`).join('; ') : undefined,
    completedAt: at,
  }
  state.outcomes.push(outcome)
  exec.outcomeId = outcome.id
  audit(state, { at, actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution completed', description: `All steps finished for ${exec.transaction.id}.`, previousState: 'running', newState: 'completed' })
  audit(state, { at, actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'outcome', action: `Outcome: ${label}`, description: outcome.reason })
}

// ── Approvals ───────────────────────────────────────────────────────────

function createApproval(state: RuntimeState, exec: Execution, step: ExecutionStep, matches: { rule: (typeof approvalRules)[number]; reason: string }[], atMs: number): Approval {
  const sorted = [...matches].sort((a, b) => (a.rule.priority === b.rule.priority ? 0 : a.rule.priority === 'high' ? -1 : 1))
  const v = exec.vars
  const seen = new Set<string>()
  const evidence = exec.steps
    .filter((s) => s.status === 'completed' && s.actor !== 'human')
    .flatMap((s) => s.evidence.filter((e) => !seen.has(e) && seen.add(e)).slice(0, 2).map((e) => `${s.name}: ${e}`))
  const fields = exec.transaction.fields
  const amount = ctxOf(exec, 1).amount
  const recommendation =
    exec.domain === 'insurance'
      ? {
          decision: v.covered === 'yes' ? 'Approve the claim' : 'Refer the claim',
          explanation: `Cover is confirmed${v.investigation === 'prepared' ? ', the investigation case file found no linked prior claims' : ''} and the repair estimate of ${money(amount)} is consistent with the damage description.`,
          attention: [
            ...(v.risk === 'high' || v.risk === 'medium' ? [`Fraud screening rated the claim ${v.risk} risk`] : []),
            ...(v.manualLookup === 'yes' ? ['Policy details were confirmed by a manual lookup — the schedule was not attached'] : []),
            ...(amount >= 10000 ? ['Amount is above the £10,000 approval threshold'] : []),
          ],
        }
      : exec.domain === 'healthcare'
        ? {
            decision: v.criteria === 'conflicting' ? 'Request clarification from the provider' : v.criteria === 'unclear' ? 'Request the missing clinical notes' : 'Approve if the clinical notes support medical necessity',
            explanation: v.criteria ? `The criteria check found the request ${v.criteria === 'met' ? 'meets criteria' : v.criteria}.` : 'No automated criteria check ran in this workflow.',
            attention: [...(v.criteria === 'conflicting' ? ['Referral and imaging report disagree'] : []), ...(v.criteria === 'unclear' ? ['Clinical notes are missing'] : [])],
          }
        : {
            decision: v.recommendation === 'decline' ? 'Decline, or approve as a documented policy exception' : 'Approve with standard conditions',
            explanation: `Risk assessed as ${v.risk ?? 'not assessed'} for ${money(amount)} requested by ${fields.business}.`,
            attention: [...(v.risk === 'high' ? ['Loan is above 50% of annual revenue'] : []), ...(amount >= 250000 ? ['Amount is above the £250,000 threshold'] : [])],
          }
  const approval: Approval = {
    id: nextId(state, 'APR'),
    executionId: exec.id,
    appId: exec.appId,
    stepId: step.id,
    transactionId: exec.transaction.id,
    type: sorted[0].rule.type,
    ruleIds: sorted.map((m) => m.rule.id),
    reasons: sorted.map((m) => m.reason),
    reviewer: step.resource?.name ?? 'Approver',
    priority: sorted.some((m) => m.rule.priority === 'high') ? 'high' : 'normal',
    status: 'pending',
    submittedAt: iso(atMs),
    recommendation: { ...recommendation, evidence, policy: sorted.map((m) => `${m.rule.id}: ${m.rule.condition}`).join(' ') },
    history: [{ at: iso(atMs), actor: 'Application Runtime', action: 'Approval requested' }],
  }
  state.approvals.push(approval)
  exec.approvalIds.push(approval.id)
  return approval
}

export function decideApproval(state: RuntimeState, approvalId: string, decision: 'approved' | 'rejected', comment: string, actor: string, nowMs: number, resolve: ResolveApp) {
  const approval = state.approvals.find((a) => a.id === approvalId)
  const exec = approval && state.executions.find((e) => e.id === approval.executionId)
  if (!approval || !exec || (approval.status !== 'pending' && approval.status !== 'info-requested') || exec.status !== 'waiting-approval') return
  const at = iso(nowMs)
  const previous = approval.status
  approval.status = decision
  approval.decidedAt = at
  approval.comment = comment || undefined
  approval.history.push({ at, actor, action: decision === 'approved' ? 'Approved' : 'Rejected', comment: comment || undefined })
  const step = exec.steps.find((s) => s.id === approval.stepId)!
  step.status = 'completed'
  step.endedAt = at
  step.output = `${decision === 'approved' ? 'Approved' : 'Rejected'} by ${actor}${comment ? `: “${comment}”` : '.'}`
  step.evidence = approval.reasons
  step.explanation = decision === 'approved' ? 'The approval was recorded, so the workflow resumed.' : rejectionHandling[exec.domain]
  exec.vars.decision = decision
  exec.vars.decidedBy = 'person'
  exec.status = 'running'
  audit(state, { at, actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'approval', action: decision === 'approved' ? 'Approval granted' : 'Approval rejected', description: `${approval.id} (${approval.type})${comment ? `: “${comment}”` : ''}`, approvalId, previousState: previous, newState: decision })
  audit(state, { at, actor: 'Application Runtime', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution resumed', description: decision === 'approved' ? 'Continuing after approval.' : 'Continuing to inform the customer after rejection.', previousState: 'waiting-approval', newState: 'running' })
  if (decision === 'rejected') addSignal(state, exec, step, 'approval-rejected', `${approval.type} rejected by ${actor}.`, [comment || 'No comment', ...approval.reasons], at, resolve)
  startStep(state, exec, exec.steps.indexOf(step) + 1, nowMs, resolve)
}

export function requestInformation(state: RuntimeState, approvalId: string, comment: string, actor: string, nowMs: number, resolve: ResolveApp) {
  const approval = state.approvals.find((a) => a.id === approvalId)
  const exec = approval && state.executions.find((e) => e.id === approval.executionId)
  if (!approval || !exec || approval.status !== 'pending') return
  const at = iso(nowMs)
  approval.status = 'info-requested'
  approval.history.push({ at, actor, action: 'Requested more information', comment })
  audit(state, { at, actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'approval', action: 'Information requested', description: `${approval.id}: “${comment}”. The execution keeps waiting.`, approvalId, previousState: 'pending', newState: 'info-requested' })
  const step = exec.steps.find((s) => s.id === approval.stepId)!
  addSignal(state, exec, step, 'missing-information', `The reviewer needed more information to decide: “${comment}”.`, [comment, ...approval.reasons], at, resolve)
}

const simulatedResponses: Record<string, string> = {
  insurance: 'Customer sent the policy schedule and two additional photos (simulated response).',
  healthcare: 'Provider sent updated clinical notes clarifying the affected side (simulated response).',
  banking: 'Applicant sent the latest management accounts (simulated response).',
}

export function respondToInformationRequest(state: RuntimeState, approvalId: string, nowMs: number) {
  const approval = state.approvals.find((a) => a.id === approvalId)
  const exec = approval && state.executions.find((e) => e.id === approval.executionId)
  if (!approval || !exec || approval.status !== 'info-requested') return
  const at = iso(nowMs)
  approval.status = 'pending'
  approval.history.push({ at, actor: exec.transaction.submittedBy, action: 'Information provided', comment: simulatedResponses[exec.domain] })
  approval.recommendation.evidence = [...approval.recommendation.evidence, `Additional information: ${simulatedResponses[exec.domain]}`]
  audit(state, { at, actor: exec.transaction.submittedBy, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'approval', action: 'Information provided', description: `${approval.id}: ${simulatedResponses[exec.domain]}`, approvalId, previousState: 'info-requested', newState: 'pending' })
}

// ── Runtime controls ────────────────────────────────────────────────────

export function pauseExecution(state: RuntimeState, execId: string, actor: string, nowMs: number) {
  const exec = state.executions.find((e) => e.id === execId)
  if (!exec || (exec.status !== 'running' && exec.status !== 'queued')) return
  const step = exec.steps[exec.current]
  exec.pausedFrom = exec.status
  if (exec.status === 'queued') exec.pausedRemainingMs = Math.max(0, (exec.startAt ?? nowMs) - nowMs)
  else if (step?.status === 'running') {
    exec.pausedRemainingMs = Math.max(0, (step.dueAt ?? nowMs) - nowMs)
    step.dueAt = undefined
  }
  delete exec.startAt
  const previous = exec.status
  exec.status = 'paused'
  audit(state, { at: iso(nowMs), actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution paused', description: step ? `Paused during “${step.name}”.` : 'Paused.', previousState: previous, newState: 'paused' })
}

export function resumeExecution(state: RuntimeState, execId: string, actor: string, nowMs: number) {
  const exec = state.executions.find((e) => e.id === execId)
  if (!exec || exec.status !== 'paused') return
  const into = exec.pausedFrom ?? 'running'
  const remaining = exec.pausedRemainingMs ?? 0
  exec.status = into
  if (into === 'queued') exec.startAt = nowMs + remaining
  else {
    const step = exec.steps[exec.current]
    if (step?.status === 'running') step.dueAt = nowMs + remaining
  }
  delete exec.pausedFrom
  delete exec.pausedRemainingMs
  audit(state, { at: iso(nowMs), actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution resumed', description: 'Resumed where it was paused.', previousState: 'paused', newState: into })
}

export function cancelExecution(state: RuntimeState, execId: string, reason: string, actor: string, nowMs: number) {
  const exec = state.executions.find((e) => e.id === execId)
  if (!exec || isTerminal(exec.status)) return
  const at = iso(nowMs)
  const previous = exec.status
  exec.steps.forEach((s, i) => {
    if (s.status === 'running' || s.status === 'awaiting-approval') {
      s.status = 'cancelled'
      s.endedAt = at
      s.dueAt = undefined
      s.explanation = 'Stopped: the execution was cancelled.'
    } else if (s.status === 'waiting' && i >= exec.current) {
      s.status = 'skipped'
      s.explanation = 'Not run: the execution was cancelled.'
    }
  })
  for (const id of exec.approvalIds) {
    const a = state.approvals.find((x) => x.id === id)
    if (a && (a.status === 'pending' || a.status === 'info-requested')) {
      a.status = 'withdrawn'
      a.history.push({ at, actor, action: 'Withdrawn — execution cancelled' })
    }
  }
  exec.status = 'cancelled'
  exec.endedAt = at
  delete exec.startAt
  audit(state, { at, actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Execution cancelled', description: reason || 'Cancelled by the user.', previousState: previous, newState: 'cancelled' })
}

export function retryStep(state: RuntimeState, execId: string, actor: string, nowMs: number, resolve: ResolveApp) {
  const exec = state.executions.find((e) => e.id === execId)
  const step = exec?.steps[exec.current]
  if (!exec || !step || exec.status !== 'failed' || !step.error?.retryable) return
  step.status = 'waiting'
  step.error = undefined
  exec.status = 'running'
  exec.endedAt = undefined
  audit(state, { at: iso(nowMs), actor, actorType: 'user', appId: exec.appId, executionId: exec.id, category: 'execution', action: 'Step retried', description: `Retrying “${step.name}” (attempt ${step.attempts + 1}).`, previousState: 'failed', newState: 'running' })
  startStep(state, exec, exec.current, nowMs, resolve)
}

// ── Learning ────────────────────────────────────────────────────────────

function addSignal(state: RuntimeState, exec: Execution, step: ExecutionStep, type: SignalType, description: string, evidence: string[], at: string, resolve: ResolveApp) {
  const signal: LearningSignal = {
    id: nextId(state, 'SIG'),
    appId: exec.appId,
    executionId: exec.id,
    nodeId: step.nodeId,
    capabilityId: step.capabilityId,
    stepName: step.name,
    resourceId: step.resource?.kind === 'person' ? undefined : step.resource?.id,
    type,
    themeKey: `${exec.appId}:${step.nodeId}:${type}`,
    description,
    evidence,
    at,
  }
  state.signals.push(signal)
  audit(state, { at, actor: 'Learning observer', actorType: 'system', appId: exec.appId, executionId: exec.id, category: 'learning', action: 'Learning captured', description: `${signal.id}: ${description}`, signalId: signal.id, resourceId: signal.resourceId })
  evaluateProposals(state, exec.appId, at, resolve)
}

/** A proposal needs at least `minSignals` matching observations — one example is never a pattern. */
export function evaluateProposals(state: RuntimeState, appId: string, at: string, resolve: ResolveApp) {
  const app = resolve(appId)
  if (!app) return
  for (const tpl of improvementTemplates.filter((t) => t.domain === app.domain)) {
    if (state.proposals.some((p) => p.appId === appId && p.ruleId === tpl.id)) continue
    const matching = state.signals.filter((s) => s.appId === appId && s.capabilityId === tpl.capabilityId && tpl.signalTypes.includes(s.type))
    if (matching.length < tpl.minSignals) continue
    const after = app.blueprint.workflow.nodes.find((n) => n.capabilityId === tpl.insert.afterCapabilityId)
    if (!after) continue
    const nodeId = `node-imp-${tpl.id}`
    if (app.blueprint.workflow.nodes.some((n) => n.id === nodeId)) continue
    const ref = Object.values(app.blueprint.resources)
      .flat()
      .find((r) => r.capabilityIds.includes(tpl.insert.resourceCapabilityId))
    const proposal = {
      id: nextId(state, 'IMP'),
      appId,
      ruleId: tpl.id,
      title: tpl.title,
      problem: tpl.problem,
      signalIds: matching.map((s) => s.id),
      proposedChange: tpl.proposedChange,
      section: tpl.section,
      expectedEffect: tpl.expectedEffect,
      risk: tpl.risk,
      status: 'open' as const,
      createdAt: at,
      patch: { kind: 'insert-step' as const, afterNodeId: after.id, description: tpl.insert.description, node: { ...tpl.insert.node, id: nodeId, resourceId: ref?.id ?? null } },
    }
    state.proposals.push(proposal)
    audit(state, { at, actor: 'Learning observer', actorType: 'system', appId, category: 'learning', action: 'Improvement proposed', description: `${proposal.id}: ${tpl.title} (based on ${matching.length} observations).`, proposalId: proposal.id })
  }
}
