/**
 * MOCK workflow configuration — the rules the simulated runtime applies. Approval triggers,
 * rejection handling, outcomes and governance policies are defined here once, so the
 * runtime, the approval queue and the governance view always agree.
 */

import type { DomainId } from '@/app/registry/types'

export interface RuleContext {
  vars: Record<string, string>
  fields: Record<string, string>
  amount: number
  /** Capability of the human step being evaluated. */
  capabilityId: string
}

export interface ApprovalRule {
  id: string
  domain: DomainId
  /** Approval type shown in the queue. */
  type: string
  /** Business-friendly condition, shown in governance and on the approval. */
  condition: string
  priority: 'high' | 'normal'
  /** Returns the specific reason when the rule applies. */
  when: (ctx: RuleContext) => string | null
}

const money = (n: number) => `£${n.toLocaleString('en-GB')}`

export const approvalRules: ApprovalRule[] = [
  {
    id: 'R-INS-HIGH-VALUE',
    domain: 'insurance',
    type: 'High-value claim',
    condition: 'Claims of £10,000 or more need a claims manager’s approval.',
    priority: 'high',
    when: (c) => (c.amount >= 10000 ? `Claimed ${money(c.amount)}, at or above the £10,000 approval threshold.` : null),
  },
  {
    id: 'R-INS-FRAUD',
    domain: 'insurance',
    type: 'Fraud risk requiring investigation',
    condition: 'Claims screened as high fraud risk need approval after investigation.',
    priority: 'high',
    when: (c) => (c.vars.risk === 'high' ? 'Fraud screening rated the claim high risk.' : null),
  },
  {
    id: 'R-INS-SETTLEMENT',
    domain: 'insurance',
    type: 'Claim settlement decision',
    condition: 'In workflows where a person decides every claim, the settlement waits for that decision.',
    priority: 'normal',
    when: (c) => (c.capabilityId === 'claim-decision' ? 'This workflow has a person decide every claim.' : null),
  },
  {
    id: 'R-INS-FRAUD-REVIEW',
    domain: 'insurance',
    type: 'Fraud review',
    condition: 'In workflows without automated screening, a fraud investigator reviews every claim.',
    priority: 'normal',
    when: (c) => (c.capabilityId === 'fraud-assessment' ? 'This workflow has a person review fraud indicators on every claim.' : null),
  },
  {
    id: 'R-HC-NECESSITY',
    domain: 'healthcare',
    type: 'Medical necessity review',
    condition: 'Requests that do not clearly meet medical necessity criteria go to a clinician.',
    priority: 'normal',
    when: (c) => (c.vars.criteria && c.vars.criteria !== 'met' ? 'The criteria check did not find the request clearly meets criteria.' : null),
  },
  {
    id: 'R-HC-CONFLICT',
    domain: 'healthcare',
    type: 'Conflicting clinical information',
    condition: 'Requests with conflicting clinical documents go to a clinician.',
    priority: 'high',
    when: (c) => (c.vars.criteria === 'conflicting' ? 'The clinical documents disagree.' : null),
  },
  {
    id: 'R-HC-MANUAL',
    domain: 'healthcare',
    type: 'Manual authorization',
    condition: 'When no criteria check ran, a clinician authorizes every request.',
    priority: 'normal',
    when: (c) => (!c.vars.criteria ? 'No automated criteria check in this workflow.' : null),
  },
  {
    id: 'R-BNK-HIGH-VALUE',
    domain: 'banking',
    type: 'High-value loan',
    condition: 'Loans of £250,000 or more need approval above a single officer’s mandate.',
    priority: 'high',
    when: (c) => (c.amount >= 250000 ? `Requested ${money(c.amount)}, at or above the £250,000 threshold.` : null),
  },
  {
    id: 'R-BNK-EXCEPTION',
    domain: 'banking',
    type: 'Credit policy exception',
    condition: 'High-risk applications are exceptions to credit policy and need approval.',
    priority: 'high',
    when: (c) => (c.vars.risk === 'high' ? 'Risk assessment rated the application high risk.' : null),
  },
  {
    id: 'R-BNK-REVIEW',
    domain: 'banking',
    type: 'Risk review',
    condition: 'A credit officer approves every credit decision.',
    priority: 'normal',
    when: () => 'Every credit decision is approved by a credit officer.',
  },
]

/** Steps that still run after a rejection, to inform the customer. */
export const communicationCapabilities = ['correspondence', 'decision-notification', 'outcome-monitoring']

export const rejectionHandling: Record<DomainId, string> = {
  insurance: 'On rejection, the claim is declined and the customer receives a decline letter; other remaining steps are skipped.',
  healthcare: 'On rejection, the authorization is denied and the provider is notified; other remaining steps are skipped.',
  banking: 'On rejection, the loan is declined and the applicant is informed; other remaining steps are skipped.',
}

export const outcomeLabels: Record<DomainId, { approvedByPerson: string; approvedAutomatically: string; rejected: string }> = {
  insurance: { approvedByPerson: 'Claim approved', approvedAutomatically: 'Claim processed', rejected: 'Claim rejected' },
  healthcare: { approvedByPerson: 'Authorization approved', approvedAutomatically: 'Authorization approved', rejected: 'Authorization denied' },
  banking: { approvedByPerson: 'Loan approved', approvedAutomatically: 'Loan approved', rejected: 'Loan rejected' },
}

export interface GovernancePolicy {
  id: string
  title: string
  description: string
  detail: string
}

export const governancePolicies: Record<DomainId, GovernancePolicy[]> = {
  insurance: [
    { id: 'GOV-INS-1', title: 'Human approval for sensitive decisions', description: 'High-value and high-risk claims are approved by a claims manager before settlement.', detail: 'Enforced by approval rules R-INS-HIGH-VALUE and R-INS-FRAUD at the human approval step. The workflow pauses until the decision is recorded.' },
    { id: 'GOV-INS-2', title: 'Every decision is recorded with its reason', description: 'Approvals, rejections and requests for information are kept with the reviewer’s comment.', detail: 'Rejections and information requests require a comment. Records are append-only in the audit trail.' },
    { id: 'GOV-INS-3', title: 'Traceable evidence', description: 'Each step records what it received, what it produced and the evidence it used.', detail: 'Step inputs, outputs and evidence are stored on the execution and linked from the audit trail.' },
  ],
  healthcare: [
    { id: 'GOV-HC-1', title: 'Clinician review for unclear requests', description: 'Requests that do not clearly meet criteria, or whose documents conflict, are decided by a clinician.', detail: 'Enforced by approval rules R-HC-NECESSITY, R-HC-CONFLICT and R-HC-MANUAL.' },
    { id: 'GOV-HC-2', title: 'No automated denial', description: 'Only a clinician can deny an authorization.', detail: 'Denials are only possible through the approval step; the runtime never denies automatically.' },
    { id: 'GOV-HC-3', title: 'Decision audit', description: 'Every decision is recorded with the reviewer and their reason.', detail: 'Append-only audit trail.' },
  ],
  banking: [
    { id: 'GOV-BNK-1', title: 'Officer approval for every credit decision', description: 'A credit officer approves every recommended decision.', detail: 'Enforced by approval rule R-BNK-REVIEW; R-BNK-HIGH-VALUE and R-BNK-EXCEPTION raise priority.' },
    { id: 'GOV-BNK-2', title: 'No facility before verification', description: 'An application cannot be decided until the applicant is verified.', detail: 'A failed verification stops the execution; it is not skipped.' },
    { id: 'GOV-BNK-3', title: 'Decision audit', description: 'Every decision is recorded with the officer and their reason.', detail: 'Append-only audit trail.' },
  ],
}
