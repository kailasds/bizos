import { createContext, useContext } from 'react'
import type { StatusTone } from '@/components/os/StatusBadge'
import type { ApprovalStatus, AuditCategory, ExecutionStatus, ProposalStatus, SignalType, StepStatus } from '../types'

export const executionStatusMeta: Record<ExecutionStatus, { label: string; tone: StatusTone }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  running: { label: 'Running', tone: 'info' },
  paused: { label: 'Paused', tone: 'neutral' },
  'waiting-approval': { label: 'Waiting for approval', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const stepStatusMeta: Record<StepStatus, { label: string; tone: StatusTone }> = {
  waiting: { label: 'Waiting', tone: 'neutral' },
  running: { label: 'Running', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'danger' },
  'awaiting-approval': { label: 'Awaiting approval', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const approvalStatusMeta: Record<ApprovalStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  'info-requested': { label: 'Information requested', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
}

export const proposalStatusMeta: Record<ProposalStatus, { label: string; tone: StatusTone }> = {
  open: { label: 'Needs review', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  deferred: { label: 'Deferred', tone: 'neutral' },
}

export const signalTypeLabel: Record<SignalType, string> = {
  'failed-execution': 'Failed execution',
  'repeated-exception': 'Repeated exception',
  'human-correction': 'Human correction',
  'approval-rejected': 'Approval rejected',
  'missing-information': 'Missing information',
  'resource-unavailable': 'Resource unavailable',
  bottleneck: 'Workflow bottleneck',
  'outcome-feedback': 'Outcome feedback',
}

export const auditCategoryLabel: Record<AuditCategory, string> = {
  execution: 'Execution',
  step: 'Workflow step',
  approval: 'Approval',
  outcome: 'Outcome',
  learning: 'Learning',
  blueprint: 'Blueprint',
  publication: 'Publication',
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export const formatDateTime = (iso?: string) => (iso ? dateFmt.format(new Date(iso)) : '—')
export const formatTime = (iso?: string) => (iso ? timeFmt.format(new Date(iso)) : '—')

/** Duration from real mock timestamps; empty when the record has no end yet. */
export function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return ''
  const s = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}

/** Cross-record navigation. Hosts (Operations, app windows) decide where each link goes. */
export interface RuntimeLinks {
  openExecution: (executionId: string) => void
  openApproval: (approvalId: string) => void
  openApplication: (appId: string) => void
  openResource: (resourceId: string) => void
}

export const RuntimeLinksContext = createContext<RuntimeLinks | null>(null)

export function useRuntimeLinks(): RuntimeLinks {
  const links = useContext(RuntimeLinksContext)
  if (!links) throw new Error('useRuntimeLinks outside a RuntimeLinksContext provider')
  return links
}
