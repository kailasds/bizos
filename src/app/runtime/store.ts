/**
 * Runtime store — the single source of operational records (executions, approvals, audit,
 * outcomes, learning signals, proposals, built-in blueprint drafts). Persisted locally under
 * the prototype prefix, so a reload continues the journey and Settings → Reset clears it.
 *
 * Seeded history is produced by running the same engine over fixed transactions at fixed
 * times, so seeds and live records can never contradict each other.
 */

import { useSyncExternalStore } from 'react'
import { applyPatch, describePatch } from '@/app/blueprint/generate'
import { validateBlueprint } from '@/app/blueprint/validate'
import { seedRuns, transactionSchemas } from '@/data/runtime.mock'
import {
  cancelExecution,
  decideApproval,
  nextId,
  pauseExecution,
  requestInformation,
  respondToInformationRequest,
  resumeExecution,
  retryStep,
  submitTransaction,
  needsTick,
  tick,
  type TransactionInput,
} from './engine'
import { BUILTIN_RUNTIME_APP, claimsIntelligenceBlueprint, getRuntimeApp, initialBuiltinState } from './runtime-apps'
import type { RuntimeState } from './types'

const KEY = 'enterprise-ai-os:runtime:v1'
const SEED_PUBLISHED_AT = '2026-11-01T09:00:00'
export const CURRENT_USER = 'You'

function emptyState(): RuntimeState {
  return { version: 1, counters: {}, executions: [], approvals: [], audit: [], outcomes: [], signals: [], proposals: [], builtin: initialBuiltinState(new Date(SEED_PUBLISHED_AT).toISOString()) }
}

/** Deterministic seeded history for the built-in Claims Intelligence application. */
export function seedState(): RuntimeState {
  const s = emptyState()
  const resolve = (id: string) => getRuntimeApp(id, s)
  const published = s.builtin[BUILTIN_RUNTIME_APP].published
  s.audit.push({ id: nextId(s, 'AUD'), at: published.publishedAt, actor: 'Claims Operations', actorType: 'user', appId: BUILTIN_RUNTIME_APP, category: 'publication', action: `Published v${published.version}`, description: 'Built-in blueprint (AI-Driven Claims Automation) is live.', newState: 'published' })
  const FAR = 1e15
  for (const run of seedRuns) {
    const app = resolve(run.appId)!
    const at = new Date(run.submittedAt).getTime()
    const schema = transactionSchemas[app.domain]
    const exec = submitTransaction(s, app, { fields: { ...run.preset.fields, [schema.idField]: run.transactionId }, documents: run.preset.documents, submittedBy: run.submittedBy }, at, 'seed')
    tick(s, FAR, resolve)
    if (exec.status === 'waiting-approval' && run.decision) {
      const approvalId = exec.approvalIds.at(-1)!
      const requested = new Date(s.approvals.find((a) => a.id === approvalId)!.submittedAt).getTime()
      decideApproval(s, approvalId, run.decision.status, run.decision.comment, run.decision.by, requested + 25 * 60_000, resolve)
      tick(s, FAR, resolve)
    }
  }
  return s
}

function load(): RuntimeState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RuntimeState
      if (parsed.version === 1 && parsed.builtin?.[BUILTIN_RUNTIME_APP]) return parsed
    }
  } catch {
    // Unreadable storage — start from the seeded history.
  }
  return seedState()
}

let state: RuntimeState = typeof window === 'undefined' ? emptyState() : load()
const listeners = new Set<() => void>()

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable: the records stay for this session.
  }
}

function commit(mutate: (draft: RuntimeState) => void) {
  const draft = structuredClone(state)
  mutate(draft)
  state = draft
  save()
  listeners.forEach((l) => l())
}

const resolveIn = (s: RuntimeState) => (id: string) => getRuntimeApp(id, s)

export function getRuntimeState() {
  return state
}

export function subscribeRuntime(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => state

export function useRuntime(): RuntimeState {
  return useSyncExternalStore(subscribeRuntime, snapshot, snapshot)
}

/** Advances due executions. Called by the runtime clock. */
export function tickRuntime(nowMs = Date.now()) {
  if (!needsTick(state, nowMs)) return
  commit((d) => tick(d, nowMs, resolveIn(d)))
}

// ── Actions ─────────────────────────────────────────────────────────────

export function nextTransactionId(appId: string): string {
  const app = getRuntimeApp(appId, state)
  if (!app) return ''
  const schema = transactionSchemas[app.domain]
  const n = state.executions.filter((e) => e.domain === app.domain).length + 1
  return `${schema.idPrefix}${String(2000 + n)}`
}

export function submit(appId: string, input: TransactionInput): string | null {
  let id: string | null = null
  commit((d) => {
    const app = getRuntimeApp(appId, d)
    if (!app) return
    id = submitTransaction(d, app, input, Date.now()).id
  })
  return id
}

export const pause = (execId: string) => commit((d) => pauseExecution(d, execId, CURRENT_USER, Date.now()))
export const resume = (execId: string) => commit((d) => resumeExecution(d, execId, CURRENT_USER, Date.now()))
export const cancel = (execId: string, reason: string) => commit((d) => cancelExecution(d, execId, reason, CURRENT_USER, Date.now()))
export const retry = (execId: string) => commit((d) => retryStep(d, execId, CURRENT_USER, Date.now(), resolveIn(d)))
export const approve = (approvalId: string, comment: string) => commit((d) => decideApproval(d, approvalId, 'approved', comment, CURRENT_USER, Date.now(), resolveIn(d)))
export const reject = (approvalId: string, comment: string) => commit((d) => decideApproval(d, approvalId, 'rejected', comment, CURRENT_USER, Date.now(), resolveIn(d)))
export const requestInfo = (approvalId: string, comment: string) => commit((d) => requestInformation(d, approvalId, comment, CURRENT_USER, Date.now(), resolveIn(d)))
export const simulateInfoResponse = (approvalId: string) => commit((d) => respondToInformationRequest(d, approvalId, Date.now()))

// ── Improvement review ──────────────────────────────────────────────────

const auditLearning = (d: RuntimeState, appId: string, proposalId: string, action: string, description: string, previousState: string, newState: string) =>
  d.audit.push({ id: nextId(d, 'AUD'), at: new Date().toISOString(), actor: CURRENT_USER, actorType: 'user', appId, category: 'learning', action, description, proposalId, previousState, newState })

/** Built-in apps: applies the proposal to a new draft blueprint version kept in the runtime store. */
export function acceptBuiltinProposal(proposalId: string) {
  commit((d) => {
    const p = d.proposals.find((x) => x.id === proposalId)
    const bp = p && d.builtin[p.appId]
    if (!p || !bp || p.status === 'accepted') return
    const base = bp.draft?.blueprint ?? bp.published.blueprint
    const next = applyPatch(base, p.patch)
    const now = new Date().toISOString()
    bp.draft = { blueprint: next, baseVersion: bp.published.version, proposalId, createdAt: now }
    bp.history.push({ version: next.version, at: now, summary: describePatch(base, p.patch), proposalId })
    const previous = p.status
    p.status = 'accepted'
    p.decidedAt = now
    p.draftVersion = next.version
    auditLearning(d, p.appId, p.id, 'Improvement accepted', `${p.id}: ${p.title}.`, previous, 'accepted')
    d.audit.push({ id: nextId(d, 'AUD'), at: now, actor: CURRENT_USER, actorType: 'user', appId: p.appId, category: 'blueprint', action: `Draft v${next.version} created`, description: `${describePatch(base, p.patch)}. Not active until validated and published.`, proposalId, previousState: `v${bp.published.version} published`, newState: `v${next.version} draft` })
  })
}

/** Studio apps: the Studio reducer creates the draft; this records the decision. */
export function recordStudioProposalAccepted(proposalId: string, draftVersion: string) {
  commit((d) => {
    const p = d.proposals.find((x) => x.id === proposalId)
    if (!p || p.status === 'accepted') return
    const now = new Date().toISOString()
    const previous = p.status
    p.status = 'accepted'
    p.decidedAt = now
    p.draftVersion = draftVersion
    auditLearning(d, p.appId, p.id, 'Improvement accepted', `${p.id}: ${p.title}.`, previous, 'accepted')
    d.audit.push({ id: nextId(d, 'AUD'), at: now, actor: CURRENT_USER, actorType: 'user', appId: p.appId, category: 'blueprint', action: `Draft v${draftVersion} created in Application Studio`, description: 'Validate and publish it in Application Studio before it becomes active.', proposalId, newState: `v${draftVersion} draft` })
  })
}

export function decideProposal(proposalId: string, status: 'rejected' | 'deferred' | 'open', note: string) {
  commit((d) => {
    const p = d.proposals.find((x) => x.id === proposalId)
    if (!p || p.status === 'accepted') return
    const previous = p.status
    p.status = status
    p.decidedAt = new Date().toISOString()
    p.decisionNote = note || undefined
    auditLearning(d, p.appId, p.id, status === 'rejected' ? 'Improvement rejected' : status === 'deferred' ? 'Improvement deferred' : 'Improvement reopened', `${p.id}: ${p.title}${note ? ` — “${note}”` : ''}.`, previous, status)
  })
}

export function validateBuiltinDraft(appId: string) {
  commit((d) => {
    const bp = d.builtin[appId]
    if (!bp?.draft) return
    const findings = validateBlueprint(bp.draft.blueprint, claimsIntelligenceBlueprint().mappings)
    const now = new Date().toISOString()
    bp.draft.validation = { ranAt: now, findings }
    const blocked = findings.filter((f) => f.status === 'blocked').length
    const review = findings.filter((f) => f.status === 'needs-review').length
    d.audit.push({ id: nextId(d, 'AUD'), at: now, actor: 'Blueprint validation', actorType: 'system', appId, category: 'blueprint', action: `Validated draft v${bp.draft.blueprint.version}`, description: `${findings.length - blocked - review} of ${findings.length} checks passed${blocked ? `, ${blocked} blocking` : ''}${review ? `, ${review} to review` : ''}.`, proposalId: bp.draft.proposalId })
  })
}

export function publishBuiltinDraft(appId: string) {
  commit((d) => {
    const bp = d.builtin[appId]
    const draft = bp?.draft
    if (!bp || !draft?.validation || draft.validation.findings.some((f) => f.status === 'blocked')) return
    const now = new Date().toISOString()
    const previous = bp.published.version
    bp.published = { version: draft.blueprint.version, blueprint: { ...draft.blueprint, status: 'published' }, publishedAt: now }
    const h = bp.history.find((x) => x.version === draft.blueprint.version)
    if (h) h.publishedAt = now
    for (const p of d.proposals.filter((x) => x.appId === appId && x.status === 'accepted' && !x.publishedVersion)) p.publishedVersion = draft.blueprint.version
    bp.draft = null
    d.audit.push({ id: nextId(d, 'AUD'), at: now, actor: CURRENT_USER, actorType: 'user', appId, category: 'publication', action: `Published v${bp.published.version}`, description: `Replaces v${previous}. New executions run on v${bp.published.version}; executions already submitted keep their version.`, proposalId: draft.proposalId, previousState: `v${previous}`, newState: `v${bp.published.version}` })
  })
}

/** Restores the seeded operational history (keeps Studio drafts and published apps). */
export function resetRuntime() {
  state = seedState()
  save()
  listeners.forEach((l) => l())
}
