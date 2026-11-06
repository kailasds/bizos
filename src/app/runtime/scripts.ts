/**
 * MOCK — simulated step processing. Each capability has a deterministic script: the same
 * transaction, attempt and earlier results always give the same output. Scripts describe
 * observable actions and evidence; they never claim model reasoning.
 */

import type { DomainId } from '@/app/registry/types'
import type { SignalType, StepError } from './types'

export interface StepContext {
  domain: DomainId
  fields: Record<string, string>
  documents: string[]
  vars: Record<string, string>
  /** 1 on the first attempt; retries increase it. */
  attempt: number
  amount: number
}

export interface StepResult {
  durationMs: number
  input: string
  output: string
  evidence: string[]
  explanation: string
  vars?: Record<string, string>
  /** Skip this step (with the reason) instead of processing it. */
  skip?: string
  fail?: StepError & { signal?: SignalType }
  signal?: { type: SignalType; description: string; evidence: string[] }
}

export const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const has = (docs: string[], re: RegExp) => docs.some((d) => re.test(d))
const docList = (docs: string[]) => (docs.length ? docs.join(', ') : 'no documents')

type Script = (c: StepContext) => StepResult

const fraudIndicators = (c: StepContext): string[] => {
  const text = (c.fields.description ?? '').toLowerCase()
  const found: string[] = []
  if (/drove off|did not stop|left the scene/.test(text)) found.push('Third party left the scene')
  if (/no witness/.test(text)) found.push('No independent witnesses')
  if (/cash/.test(text)) found.push('Cash settlement requested')
  if (c.amount >= 15000) found.push(`Claimed amount ${money(c.amount)} is above £15,000`)
  return found
}

const scripts: Record<string, Script> = {
  // ── Intake ─────────────────────────────────────────────────────────────
  'claim-intake': (c) => ({
    durationMs: 1400,
    input: `Claim form from ${c.fields.customer || 'the customer'}: “${c.fields.description || 'no description'}”`,
    output: `Claim registered: motor, incident on ${c.fields.incidentDate || 'unknown date'}, estimated damage ${money(c.amount)}, policy ${c.fields.policyNumber || 'not given'}.`,
    evidence: [`Claim form fields: customer, policy, incident date, description, estimate`, `Attachments: ${docList(c.documents)}`],
    explanation: 'Registered claims move on to document extraction.',
  }),
  'request-intake': (c) => ({
    durationMs: 1300,
    input: `Prior authorization request from ${c.fields.provider || 'the provider'} for ${c.fields.procedure || 'a procedure'}`,
    output: `Request registered for member ${c.fields.memberId || 'unknown'}: ${c.fields.procedure}, diagnosis “${c.fields.diagnosis}”.`,
    evidence: [`Request form from ${c.fields.provider}`, `Attachments: ${docList(c.documents)}`],
    explanation: 'Registered requests move on to reading the clinical documents.',
  }),
  'application-intake': (c) => ({
    durationMs: 1300,
    input: `Loan application from ${c.fields.business || 'the business'}`,
    output: `Application registered: ${money(c.amount)} requested by ${c.fields.business} (${c.fields.category || 'uncategorised'}), annual revenue ${money(Number(c.fields.revenue) || 0)}.`,
    evidence: ['Application form', `Attachments: ${docList(c.documents)}`],
    explanation: 'Registered applications move on to document reading.',
  }),

  // ── Documents ──────────────────────────────────────────────────────────
  'document-extraction': (c) => {
    const unreadable = c.documents.find((d) => /illegible|unreadable/i.test(d))
    if (unreadable && c.attempt === 1) {
      return {
        durationMs: 1800,
        input: `Attachments: ${docList(c.documents)}`,
        output: '',
        evidence: [`${unreadable}: no text could be read (simulated scan quality check)`],
        explanation: '',
        fail: {
          what: `Could not read “${unreadable}”.`,
          impact: 'Details from this document are not available to later steps, so the workflow cannot continue.',
          nextAction: 'Retry the step — the simulated retry re-processes a clearer copy — or ask the submitter to resend the document.',
          retryable: true,
        },
      }
    }
    if (c.domain === 'banking' && !has(c.documents, /statement/i)) {
      return {
        durationMs: 1600,
        input: `Attachments: ${docList(c.documents)}`,
        output: '',
        evidence: ['No bank statements among the attachments'],
        explanation: '',
        fail: {
          what: 'Bank statements are missing from the application.',
          impact: 'Cash flow cannot be assessed, so no credit decision can be made.',
          nextAction: 'Ask the applicant for 12 months of bank statements and submit the application again.',
          retryable: false,
          signal: 'missing-information',
        },
      }
    }
    const extracted =
      c.domain === 'insurance'
        ? `incident date ${c.fields.incidentDate}, repair estimate ${money(c.amount)}, damage description`
        : c.domain === 'healthcare'
          ? `diagnosis, procedure, treatment history${has(c.documents, /notes/i) ? ', clinical notes' : ''}`
          : `monthly inflows and outflows, revenue ${money(Number(c.fields.revenue) || 0)}, existing borrowing`
    return {
      durationMs: 2000,
      input: `Attachments: ${docList(c.documents)}`,
      output: `Extracted ${extracted}.${unreadable ? ' A clearer copy was processed on retry (simulated).' : ''}`,
      evidence: c.documents.map((d) => `Read ${d}`),
      explanation: 'Extracted details are passed to the next check.',
      vars: { policySchedule: has(c.documents, /policy|schedule/i) ? 'yes' : 'no' },
    }
  },

  // ── Insurance ──────────────────────────────────────────────────────────
  'coverage-validation': (c) => {
    const policy = c.fields.policyNumber || ''
    if (/LAPSED/i.test(policy)) {
      return {
        durationMs: 1700,
        input: `Policy ${policy}, incident on ${c.fields.incidentDate}`,
        output: '',
        evidence: [`Policy administration connector: ${policy} status lapsed before ${c.fields.incidentDate} (simulated)`],
        explanation: '',
        fail: {
          what: `Policy ${policy} was not in force on the incident date.`,
          impact: 'The claim cannot be validated against cover, so no decision can be made.',
          nextAction: 'Confirm the policy number with the customer, then submit a corrected claim. Retrying would give the same result.',
          retryable: false,
        },
      }
    }
    const manual = c.vars.policySchedule === 'no'
    return {
      durationMs: 1800,
      input: `Policy ${policy}, incident on ${c.fields.incidentDate}, estimate ${money(c.amount)}`,
      output: manual
        ? 'Cover confirmed after a manual policy lookup: comprehensive motor, £250 excess.'
        : 'Cover confirmed from the attached policy schedule: comprehensive motor, £250 excess.',
      evidence: manual
        ? ['No policy schedule attached', `Policy terms for ${policy} looked up manually in the policy administration system (simulated)`]
        : ['Policy schedule: comprehensive cover in force on the incident date', 'Excess: £250'],
      explanation: 'Covered claims move on to fraud screening.',
      vars: { covered: 'yes', manualLookup: manual ? 'yes' : 'no' },
      signal: manual
        ? {
            type: 'missing-information',
            description: 'The policy schedule was missing, so cover was confirmed by a manual lookup.',
            evidence: ['No policy schedule among the attachments', 'Manual lookup recorded at coverage validation'],
          }
        : undefined,
    }
  },
  'fraud-assessment': (c) => {
    const found = fraudIndicators(c)
    const risk = found.length >= 2 ? 'high' : found.length === 1 ? 'medium' : 'low'
    return {
      durationMs: 1700,
      input: `Claim details, incident description and amount ${money(c.amount)}`,
      output: `Fraud risk: ${risk} — ${found.length ? `${found.length} indicator${found.length === 1 ? '' : 's'} found` : 'no indicators found'}.`,
      evidence: found.length ? found : ['No fraud indicators in the claim details'],
      explanation: risk === 'high' ? 'High fraud risk triggers a fraud investigation.' : 'Fraud investigation runs only for high-risk claims.',
      vars: { risk },
    }
  },
  'fraud-investigation': (c) => {
    if (c.vars.risk !== 'high') {
      return { durationMs: 0, input: '', output: '', evidence: [], explanation: '', skip: `Not required: fraud risk is ${c.vars.risk ?? 'not assessed'}; the workflow investigates high-risk claims only.` }
    }
    const found = fraudIndicators(c)
    return {
      durationMs: 2300,
      input: `High-risk claim with indicators: ${found.join('; ')}`,
      output: 'Investigation case file prepared: indicators summarised with sources, no linked prior claims found, 3 questions drafted for the reviewer.',
      evidence: [...found, `No prior claims linked to ${c.fields.policyNumber} (simulated lookup)`, `Repair estimate consistent with the damage description`],
      explanation: 'The case file goes to the reviewer with the claim.',
      vars: { investigation: 'prepared' },
    }
  },
  'risk-routing': (c) => {
    if (c.domain === 'healthcare') {
      const clear = c.vars.criteria === 'met'
      return {
        durationMs: 900,
        input: `Criteria result: ${c.vars.criteria ?? 'not checked'}`,
        output: clear ? 'Routed as clear: criteria met.' : 'Routed for clinical review.',
        evidence: [`Routing rule: criteria ${clear ? 'met → decide' : 'not clearly met → clinician'}`],
        explanation: clear ? 'Clear requests are approved without a clinical review.' : 'Unclear requests go to a clinician.',
        vars: { route: clear ? 'routine' : 'exception', ...(clear ? { decision: 'approved', decidedBy: 'rules' } : {}) },
      }
    }
    const exception = c.vars.risk === 'high' || c.amount >= 10000
    return {
      durationMs: 900,
      input: `Fraud risk ${c.vars.risk ?? 'not assessed'}, amount ${money(c.amount)}`,
      output: exception ? 'Routed as an exception: a person decides.' : 'Routed as routine: decided by rules.',
      evidence: [`Routing rule: high risk or ${money(10000)}+ → exception`],
      explanation: exception ? 'Exceptions skip the automated decision and wait for a person.' : 'Routine claims are decided by the rules.',
      vars: { route: exception ? 'exception' : 'routine' },
    }
  },
  'claim-decision': (c) => {
    if (c.vars.route === 'exception') {
      return { durationMs: 0, input: '', output: '', evidence: [], explanation: '', skip: 'Not decided automatically: the claim was routed as an exception, so a person decides.' }
    }
    return {
      durationMs: 1200,
      input: `Cover ${c.vars.covered === 'yes' ? 'confirmed' : 'unknown'}, fraud risk ${c.vars.risk ?? 'low'}, amount ${money(c.amount)}`,
      output: `Approved within automated authority: covered, ${c.vars.risk ?? 'low'} risk, below ${money(10000)}.`,
      evidence: ['Decision rule: covered + not high risk + below £10,000 → approve', `Settlement ${money(Math.max(0, c.amount - 250))} after £250 excess`],
      explanation: 'Decided claims move on to correspondence.',
      vars: { decision: 'approved', decidedBy: 'rules' },
    }
  },
  correspondence: (c) => {
    const rejected = c.vars.decision === 'rejected'
    return {
      durationMs: 1500,
      input: `Decision: ${c.vars.decision ?? 'pending'}${c.vars.decidedBy === 'person' ? ' (by a person)' : ''}`,
      output: rejected
        ? `Decline letter drafted for ${c.fields.customer}, giving the reviewer’s reason (simulated; not sent).`
        : `Settlement letter drafted for ${c.fields.customer}: payment of ${money(Math.max(0, c.amount - 250))} after the £250 excess (simulated; not sent).`,
      evidence: [rejected ? 'Template: motor claim decline v2 (simulated)' : 'Template: motor settlement v2 (simulated)'],
      explanation: 'Correspondence is the last customer-facing step.',
    }
  },

  // ── Healthcare ─────────────────────────────────────────────────────────
  'eligibility-check': (c) => {
    if (/^MBR-9/i.test(c.fields.memberId ?? '') && c.attempt === 1) {
      return {
        durationMs: 2600,
        input: `Member ${c.fields.memberId}`,
        output: '',
        evidence: ['Provider records connector: no response within 30 seconds (simulated timeout)'],
        explanation: '',
        fail: {
          what: 'The eligibility check timed out waiting for the provider records connector.',
          impact: 'Eligibility is unknown, so the request cannot be reviewed yet.',
          nextAction: 'Retry the step. The simulated connector responds on the next attempt.',
          retryable: true,
        },
      }
    }
    return {
      durationMs: 1300,
      input: `Member ${c.fields.memberId}, procedure ${c.fields.procedure}`,
      output: `Member ${c.fields.memberId} is eligible: active plan; ${c.fields.procedure} requires prior authorization.`,
      evidence: ['Provider records connector: plan active (simulated)'],
      explanation: 'Eligible requests move on to the medical necessity check.',
    }
  },
  'clinical-criteria-review': (c) => {
    const notes = c.fields.notes ?? ''
    const criteria = /conflict/i.test(notes) ? 'conflicting' : !has(c.documents, /notes/i) ? 'unclear' : 'met'
    return {
      durationMs: 2100,
      input: `${c.fields.procedure} for “${c.fields.diagnosis}”; notes: ${notes || 'none'}`,
      output:
        criteria === 'met'
          ? 'Criteria met: documented conservative treatment and clinical signs (simulated criteria set).'
          : criteria === 'conflicting'
            ? 'Criteria unclear: the clinical documents conflict.'
            : 'Criteria unclear: clinical notes are missing.',
      evidence: criteria === 'conflicting' ? ['Referral and imaging report disagree (as stated in the notes)'] : criteria === 'met' ? ['Conservative treatment documented', 'Clinical signs documented'] : ['No clinical notes attached'],
      explanation: criteria === 'met' ? 'Requests that meet criteria are routed as clear.' : 'Unclear requests go to a clinician.',
      vars: { criteria },
      signal:
        criteria === 'unclear'
          ? { type: 'missing-information', description: 'Clinical notes were missing, so the criteria check could not complete.', evidence: ['No clinical notes among the attachments'] }
          : undefined,
    }
  },
  'decision-notification': (c) => {
    const rejected = c.vars.decision === 'rejected'
    const who = c.domain === 'healthcare' ? c.fields.provider : c.fields.business
    return {
      durationMs: 1200,
      input: `Decision: ${c.vars.decision ?? 'pending'}`,
      output:
        c.domain === 'healthcare'
          ? `Decision letter to ${who}: authorization ${rejected ? 'denied, with the clinician’s reason' : 'approved'} (simulated; not sent).`
          : `${rejected ? 'Decline' : 'Offer'} letter to ${who}${rejected ? '' : `: facility of ${money(c.amount)}`} (simulated; not sent).`,
      evidence: ['Notification Service template (simulated)'],
      explanation: 'Notification is the last step.',
    }
  },

  // ── Banking ────────────────────────────────────────────────────────────
  'kyc-check': (c) => {
    if (/enhanced due diligence/i.test(c.fields.notes ?? '')) {
      return {
        durationMs: 1500,
        input: `Business ${c.fields.business} and its directors`,
        output: '',
        evidence: ['KYC Checker: enhanced due diligence is restricted on the Agent Control Plane (simulated)'],
        explanation: '',
        fail: {
          what: 'The KYC Checker cannot run enhanced due diligence for this application.',
          impact: 'The applicant cannot be verified, and no facility can be offered before verification.',
          nextAction: 'Route the applicant to the compliance team for a manual check. Retrying would give the same result.',
          retryable: false,
          signal: 'resource-unavailable',
        },
      }
    }
    return {
      durationMs: 1500,
      input: `Business ${c.fields.business} and its directors`,
      output: 'Business and directors verified; no sanctions matches (simulated).',
      evidence: ['Companies register match (simulated)', 'Sanctions screening clear (simulated)'],
      explanation: 'Verified applicants move on to risk assessment.',
    }
  },
  'cash-flow-analysis': (c) => {
    const revenue = Number(c.fields.revenue) || 1
    const ratio = c.amount / revenue
    const risk = ratio > 0.5 ? 'high' : ratio > 0.25 ? 'medium' : 'low'
    return {
      durationMs: 2000,
      input: `Requested ${money(c.amount)}, annual revenue ${money(revenue)}, 12 months of statements`,
      output: `Risk: ${risk} — the loan is ${(ratio * 100).toFixed(0)}% of annual revenue.`,
      evidence: [`Loan-to-revenue: ${money(c.amount)} ÷ ${money(revenue)}`, 'Credit policy bands: up to 25% low, up to 50% medium, above 50% high'],
      explanation: 'The risk rating is passed to the recommendation.',
      vars: { risk },
    }
  },
  'credit-decision': (c) => {
    const approve = c.vars.risk !== 'high'
    return {
      durationMs: 1200,
      input: `Risk ${c.vars.risk ?? 'not assessed'}, amount ${money(c.amount)}`,
      output: approve ? 'Recommendation: approve within policy, standard conditions.' : 'Recommendation: decline unless an exception is approved — risk is outside policy.',
      evidence: ['Credit policy rules (simulated)'],
      explanation: 'A credit officer approves every decision.',
      vars: { recommendation: approve ? 'approve' : 'decline' },
    }
  },

  // ── Shared system steps ────────────────────────────────────────────────
  'task-allocation': (c) => ({
    durationMs: 800,
    input: 'Work type and urgency',
    output: `Allocated to the ${c.domain === 'insurance' ? 'motor claims' : c.domain === 'healthcare' ? 'utilisation review' : 'SME credit'} team queue.`,
    evidence: ['Allocation rule: by work type (simulated)'],
    explanation: 'Allocated work continues through the workflow.',
  }),
  'outcome-monitoring': () => ({
    durationMs: 700,
    input: 'Completed execution record',
    output: 'Outcome recorded for monitoring.',
    evidence: ['Outcome Monitoring service (simulated)'],
    explanation: 'Monitoring is the last step.',
  }),
  // Steps added by accepted improvements.
  'information-check': (c) => {
    const ok = c.domain === 'insurance' ? has(c.documents, /policy|schedule/i) : c.domain === 'healthcare' ? has(c.documents, /notes/i) : has(c.documents, /statement/i)
    return {
      durationMs: 1000,
      input: `Attachments: ${docList(c.documents)}`,
      output: ok ? 'Required information present.' : 'Required information missing: request sent to the submitter (simulated); processing continues with what is available.',
      evidence: [ok ? 'Required document found' : 'Required document not found'],
      explanation: 'Checked submissions continue to the next step.',
    }
  },
}

const generic: Script = () => ({
  durationMs: 1000,
  input: 'Output of the previous step',
  output: 'Step completed (simulated).',
  evidence: [],
  explanation: 'Continues to the next step.',
})

export function runScript(capabilityId: string, ctx: StepContext): StepResult {
  return (scripts[capabilityId] ?? generic)(ctx)
}

export const isScripted = (capabilityId: string) => capabilityId in scripts
