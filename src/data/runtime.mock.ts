/**
 * MOCK — runtime fixtures: business transaction schemas, demo presets, seeded execution
 * history and improvement-proposal templates. Every value is fabricated for the prototype.
 * Behaviour (step processing, approval rules) lives in src/app/runtime/; this file is data.
 */

import type { WorkflowNode } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import type { SignalType } from '@/app/runtime/types'
import type { BlueprintSection } from '@/app/studio/types'

export interface TransactionField {
  id: string
  label: string
  type: 'text' | 'longtext' | 'money' | 'date'
  placeholder?: string
}

export interface TransactionPreset {
  id: string
  label: string
  /** What the preset demonstrates, so the user knows what will happen. */
  shows: string
  fields: Record<string, string>
  documents: string[]
}

export interface TransactionSchema {
  domain: DomainId
  kind: string
  /** e.g. "Submit a claim". */
  action: string
  noun: string
  idField: string
  idPrefix: string
  titleField: string
  amountField?: string
  fields: TransactionField[]
  presets: TransactionPreset[]
}

export const transactionSchemas: Record<DomainId, TransactionSchema> = {
  insurance: {
    domain: 'insurance',
    kind: 'motor-claim',
    action: 'Submit a claim',
    noun: 'claim',
    idField: 'claimId',
    idPrefix: 'CLM-24-',
    titleField: 'customer',
    amountField: 'amount',
    fields: [
      { id: 'claimId', label: 'Claim ID', type: 'text' },
      { id: 'policyNumber', label: 'Policy number', type: 'text', placeholder: 'POL-MTR-…' },
      { id: 'customer', label: 'Customer name', type: 'text' },
      { id: 'description', label: 'Incident description', type: 'longtext' },
      { id: 'incidentDate', label: 'Incident date', type: 'date' },
      { id: 'amount', label: 'Estimated damage (£)', type: 'money' },
    ],
    presets: [
      {
        id: 'high-value',
        label: 'High-value motor claim',
        shows: 'Fraud investigation and a claims manager’s approval',
        fields: {
          policyNumber: 'POL-MTR-55120',
          customer: 'Daniel Reyes',
          description: 'Rear-end collision on the A40. The third party drove off and there were no witnesses.',
          incidentDate: '2026-11-03',
          amount: '18400',
        },
        documents: ['damage-photos.zip', 'repair-estimate.pdf'],
      },
      {
        id: 'routine',
        label: 'Routine windscreen claim',
        shows: 'Decided automatically within the rules — no approval',
        fields: {
          policyNumber: 'POL-MTR-48211',
          customer: 'Priya Natarajan',
          description: 'Stone chip cracked the windscreen on the M4.',
          incidentDate: '2026-11-02',
          amount: '640',
        },
        documents: ['windscreen-photo.jpg', 'policy-schedule.pdf', 'glazier-quote.pdf'],
      },
      {
        id: 'illegible',
        label: 'Unreadable document',
        shows: 'Document extraction fails; retry succeeds',
        fields: {
          policyNumber: 'POL-MTR-50007',
          customer: 'Tom Hughes',
          description: 'Car park scrape to the rear bumper.',
          incidentDate: '2026-11-01',
          amount: '1250',
        },
        documents: ['scan-illegible.pdf', 'policy-schedule.pdf'],
      },
      {
        id: 'lapsed',
        label: 'Lapsed policy',
        shows: 'Coverage validation fails; no retry',
        fields: {
          policyNumber: 'POL-MTR-LAPSED-3301',
          customer: 'Grace Whitfield',
          description: 'Side mirror broken while parked on the street.',
          incidentDate: '2026-10-30',
          amount: '380',
        },
        documents: ['mirror-photo.jpg', 'policy-schedule.pdf'],
      },
    ],
  },
  healthcare: {
    domain: 'healthcare',
    kind: 'prior-authorization',
    action: 'Submit a prior authorization request',
    noun: 'request',
    idField: 'requestId',
    idPrefix: 'PA-',
    titleField: 'memberId',
    fields: [
      { id: 'requestId', label: 'Request ID', type: 'text' },
      { id: 'memberId', label: 'Member ID', type: 'text', placeholder: 'MBR-…' },
      { id: 'procedure', label: 'Procedure', type: 'text' },
      { id: 'diagnosis', label: 'Diagnosis', type: 'text' },
      { id: 'provider', label: 'Provider', type: 'text' },
      { id: 'notes', label: 'Clinical notes summary', type: 'longtext' },
    ],
    presets: [
      {
        id: 'clear',
        label: 'Request that meets criteria',
        shows: 'Criteria met; decided without a clinical review',
        fields: {
          memberId: 'MBR-30418',
          procedure: 'MRI lumbar spine',
          diagnosis: 'Low back pain with radiculopathy, 8 weeks',
          provider: 'Northgate Orthopaedics',
          notes: 'Six weeks of physiotherapy without improvement; neurological signs documented.',
        },
        documents: ['referral-letter.pdf', 'clinical-notes.pdf', 'physio-report.pdf'],
      },
      {
        id: 'conflicting',
        label: 'Conflicting clinical information',
        shows: 'Clinician review of a conflicting request',
        fields: {
          memberId: 'MBR-30562',
          procedure: 'Knee arthroscopy',
          diagnosis: 'Meniscal tear',
          provider: 'Riverside Surgical',
          notes: 'Imaging report and referral conflict on which knee is affected.',
        },
        documents: ['referral-letter.pdf', 'clinical-notes.pdf', 'imaging-report.pdf'],
      },
      {
        id: 'timeout',
        label: 'Eligibility check times out',
        shows: 'Provider records connector timeout; retry succeeds',
        fields: {
          memberId: 'MBR-90233',
          procedure: 'Sleep study',
          diagnosis: 'Suspected obstructive sleep apnoea',
          provider: 'Westbrook Sleep Clinic',
          notes: 'Epworth score 15; witnessed apnoeas.',
        },
        documents: ['referral-letter.pdf', 'clinical-notes.pdf'],
      },
    ],
  },
  banking: {
    domain: 'banking',
    kind: 'sme-loan',
    action: 'Submit a loan application',
    noun: 'application',
    idField: 'applicationId',
    idPrefix: 'LN-',
    titleField: 'business',
    amountField: 'amount',
    fields: [
      { id: 'applicationId', label: 'Application ID', type: 'text' },
      { id: 'business', label: 'Business name', type: 'text' },
      { id: 'amount', label: 'Requested loan amount (£)', type: 'money' },
      { id: 'category', label: 'Business category', type: 'text' },
      { id: 'revenue', label: 'Annual revenue (£)', type: 'money' },
      { id: 'notes', label: 'Notes', type: 'longtext' },
    ],
    presets: [
      {
        id: 'standard',
        label: 'Standard working-capital loan',
        shows: 'Recommended within policy; credit officer approves',
        fields: { business: 'Harbour Lane Bakery Ltd', amount: '60000', category: 'Food and beverage', revenue: '420000', notes: 'Second site fit-out.' },
        documents: ['bank-statements-12m.pdf', 'management-accounts.pdf'],
      },
      {
        id: 'high-value',
        label: 'High-value loan',
        shows: 'High-value and credit-policy exception approval',
        fields: { business: 'Calder Freight Services', amount: '480000', category: 'Logistics', revenue: '760000', notes: 'Fleet replacement.' },
        documents: ['bank-statements-12m.pdf', 'management-accounts.pdf', 'fleet-quote.pdf'],
      },
      {
        id: 'missing-docs',
        label: 'Missing bank statements',
        shows: 'Document extraction fails; resubmission needed',
        fields: { business: 'Brightside Florists', amount: '25000', category: 'Retail', revenue: '180000', notes: 'Stock for the holiday season.' },
        documents: ['management-accounts.pdf'],
      },
      {
        id: 'edd',
        label: 'Enhanced due diligence',
        shows: 'Required resource unavailable (KYC Checker restricted)',
        fields: { business: 'Meridian Trade Partners', amount: '150000', category: 'Import and export', revenue: '900000', notes: 'Requires enhanced due diligence: overseas directors.' },
        documents: ['bank-statements-12m.pdf', 'management-accounts.pdf'],
      },
    ],
  },
}

/** Seeded history for the built-in Claims Intelligence application (runs through the same engine). */
export interface SeedRun {
  appId: string
  preset: TransactionPreset
  transactionId: string
  submittedAt: string
  submittedBy: string
  /** Scripted reviewer decision when the run reaches an approval. */
  decision?: { status: 'approved' | 'rejected'; by: string; comment: string }
  /** Stop at the first failure without retrying. */
  leaveFailed?: boolean
}

export const seedRuns: SeedRun[] = [
  {
    appId: 'claims-intelligence',
    transactionId: 'CLM-24-1987',
    submittedAt: '2026-11-04T09:12:00',
    submittedBy: 'Broker portal',
    preset: { id: 'seed-routine', label: '', shows: '', fields: { policyNumber: 'POL-MTR-47310', customer: 'Olivia Brennan', description: 'Windscreen cracked by road debris.', incidentDate: '2026-11-03', amount: '520' }, documents: ['windscreen-photo.jpg', 'policy-schedule.pdf'] },
  },
  {
    appId: 'claims-intelligence',
    transactionId: 'CLM-24-1991',
    submittedAt: '2026-11-04T11:40:00',
    submittedBy: 'Customer portal',
    preset: { id: 'seed-missing-policy', label: '', shows: '', fields: { policyNumber: 'POL-MTR-51876', customer: 'Marcus Webb', description: 'Low-speed bump in a supermarket car park.', incidentDate: '2026-11-02', amount: '2100' }, documents: ['damage-photo.jpg', 'repair-estimate.pdf'] },
  },
  {
    appId: 'claims-intelligence',
    transactionId: 'CLM-24-1994',
    submittedAt: '2026-11-05T08:25:00',
    submittedBy: 'Customer portal',
    leaveFailed: true,
    preset: { id: 'seed-illegible', label: '', shows: '', fields: { policyNumber: 'POL-MTR-49950', customer: 'Hannah Cole', description: 'Hail damage to the bonnet and roof.', incidentDate: '2026-11-04', amount: '3300' }, documents: ['scan-illegible.pdf', 'policy-schedule.pdf'] },
  },
  {
    appId: 'claims-intelligence',
    transactionId: 'CLM-24-1998',
    submittedAt: '2026-11-05T14:05:00',
    submittedBy: 'Broker portal',
    decision: { status: 'approved', by: 'A. Okafor (Claims manager)', comment: 'Investigation file reviewed; damage matches the estimate.' },
    preset: { id: 'seed-high-value', label: '', shows: '', fields: { policyNumber: 'POL-MTR-52044', customer: 'Samuel Ortiz', description: 'Collision at a junction; the other driver did not stop.', incidentDate: '2026-11-04', amount: '14200' }, documents: ['damage-photos.zip', 'repair-estimate.pdf', 'policy-schedule.pdf'] },
  },
]

/**
 * Improvement templates. A proposal is generated only when at least `minSignals` signals of
 * the listed types occur at a step with `capabilityId` in the same application — one example
 * is shown as an observation, never as a pattern.
 */
export interface ImprovementTemplate {
  id: string
  domain: DomainId
  capabilityId: string
  signalTypes: SignalType[]
  minSignals: number
  title: string
  problem: string
  proposedChange: string
  section: BlueprintSection
  expectedEffect: string
  risk: string
  insert: { afterCapabilityId: string; node: Omit<WorkflowNode, 'id' | 'resourceId'>; resourceCapabilityId: string; description: string }
}

export const improvementTemplates: ImprovementTemplate[] = [
  {
    id: 'ins-policy-info',
    domain: 'insurance',
    capabilityId: 'coverage-validation',
    signalTypes: ['missing-information'],
    minSignals: 2,
    title: 'Request missing policy information earlier',
    problem: 'Claims arrive without a policy schedule, so cover is confirmed by a manual lookup during coverage validation.',
    proposedChange: 'Add a “Check policy information” step straight after claim intake. It checks that the policy schedule is attached and asks the customer for it before documents are processed.',
    section: 'workflow',
    expectedEffect: 'Missing policy details are requested at intake instead of being looked up by hand later in the claim.',
    risk: 'Customers who cannot find their schedule are asked for it once more; the step must not block claims where cover can be confirmed another way.',
    insert: {
      afterCapabilityId: 'claim-intake',
      resourceCapabilityId: 'risk-routing',
      description: 'Checks that the policy schedule is attached and requests it from the customer if not.',
      node: { name: 'Check policy information', actor: 'system', capabilityId: 'information-check', role: null, inputs: ['policyNumber'], outputs: ['status'] },
    },
  },
  {
    id: 'ins-doc-verify',
    domain: 'insurance',
    capabilityId: 'document-extraction',
    signalTypes: ['failed-execution'],
    minSignals: 2,
    title: 'Add a document verification step',
    problem: 'Claims fail at document extraction because attachments cannot be read.',
    proposedChange: 'Add a “Verify documents” step after intake that checks each attachment can be read and asks for a clearer copy before extraction starts.',
    section: 'workflow',
    expectedEffect: 'Unreadable attachments are caught at intake rather than failing the claim during extraction.',
    risk: 'Adds a check to every claim, including those with readable documents.',
    insert: {
      afterCapabilityId: 'claim-intake',
      resourceCapabilityId: 'document-extraction',
      description: 'Checks that every attachment can be read before extraction.',
      node: { name: 'Verify documents', actor: 'automated', capabilityId: 'document-verification', role: null, inputs: ['summary'], outputs: ['status'] },
    },
  },
  {
    id: 'ins-high-risk-routing',
    domain: 'insurance',
    capabilityId: 'human-review',
    signalTypes: ['approval-rejected', 'missing-information'],
    minSignals: 2,
    title: 'Improve routing for high-risk claims',
    problem: 'Approvers reject or send back high-risk claims that reach them without enough investigation detail.',
    proposedChange: 'Add a “Route high-risk claims to an investigator” step before approval so investigators complete the case file first.',
    section: 'workflow',
    expectedEffect: 'Approvers receive high-risk claims with a completed investigation.',
    risk: 'High-risk claims take longer to reach a decision.',
    insert: {
      afterCapabilityId: 'fraud-investigation',
      resourceCapabilityId: 'risk-routing',
      description: 'Sends high-risk claims to an investigator before approval.',
      node: { name: 'Route high-risk claims to an investigator', actor: 'system', capabilityId: 'investigator-routing', role: null, inputs: ['risk'], outputs: ['status'] },
    },
  },
  {
    id: 'hc-missing-docs',
    domain: 'healthcare',
    capabilityId: 'clinical-criteria-review',
    signalTypes: ['missing-information'],
    minSignals: 2,
    title: 'Request missing clinical documents before submission',
    problem: 'Requests reach the medical necessity check without clinical notes, so the check cannot complete.',
    proposedChange: 'Add a “Check clinical documents” step after the request is received that asks the provider for missing notes.',
    section: 'workflow',
    expectedEffect: 'Providers are asked for missing notes before review instead of after it.',
    risk: 'Providers may see an extra request on urgent cases; urgent requests should still proceed.',
    insert: {
      afterCapabilityId: 'request-intake',
      resourceCapabilityId: 'risk-routing',
      description: 'Checks that clinical notes are attached and asks the provider for them if not.',
      node: { name: 'Check clinical documents', actor: 'system', capabilityId: 'information-check', role: null, inputs: ['procedure'], outputs: ['status'] },
    },
  },
  {
    id: 'hc-conflict-review',
    domain: 'healthcare',
    capabilityId: 'human-review',
    signalTypes: ['approval-rejected', 'missing-information'],
    minSignals: 2,
    title: 'Add a review condition for conflicting information',
    problem: 'Clinicians send back requests where the clinical documents disagree.',
    proposedChange: 'Add a “Check for conflicting information” step before the medical necessity check that flags disagreements for the provider to resolve.',
    section: 'workflow',
    expectedEffect: 'Conflicts are resolved with the provider before a clinician reviews the request.',
    risk: 'Some conflicts are minor; the check needs clear rules to avoid unnecessary requests.',
    insert: {
      afterCapabilityId: 'document-extraction',
      resourceCapabilityId: 'risk-routing',
      description: 'Flags disagreements between clinical documents.',
      node: { name: 'Check for conflicting information', actor: 'system', capabilityId: 'conflict-check', role: null, inputs: ['summary'], outputs: ['status'] },
    },
  },
  {
    id: 'bnk-missing-docs',
    domain: 'banking',
    capabilityId: 'document-extraction',
    signalTypes: ['failed-execution', 'missing-information'],
    minSignals: 2,
    title: 'Add a missing-document validation step',
    problem: 'Applications fail at document extraction because bank statements are missing.',
    proposedChange: 'Add a “Check required documents” step after intake that asks the applicant for missing statements before processing.',
    section: 'workflow',
    expectedEffect: 'Missing statements are requested at intake instead of failing the application later.',
    risk: 'Relationship managers may need to chase applicants earlier.',
    insert: {
      afterCapabilityId: 'application-intake',
      resourceCapabilityId: 'credit-decision',
      description: 'Checks that statements and accounts are attached.',
      node: { name: 'Check required documents', actor: 'system', capabilityId: 'information-check', role: null, inputs: ['amount'], outputs: ['status'] },
    },
  },
  {
    id: 'bnk-exception-review',
    domain: 'banking',
    capabilityId: 'kyc-check',
    signalTypes: ['resource-unavailable', 'failed-execution'],
    minSignals: 2,
    title: 'Route specific risk exceptions for human review',
    problem: 'Applications needing enhanced due diligence fail because the KYC Checker cannot run those checks.',
    proposedChange: 'Add a “Route enhanced due diligence to compliance” step before verification so these applicants go to the compliance team.',
    section: 'workflow',
    expectedEffect: 'Applicants who need enhanced checks reach compliance instead of failing.',
    risk: 'Compliance workload increases; the routing rule must stay narrow.',
    insert: {
      afterCapabilityId: 'application-intake',
      resourceCapabilityId: 'credit-decision',
      description: 'Sends applicants needing enhanced due diligence to compliance.',
      node: { name: 'Route enhanced due diligence to compliance', actor: 'system', capabilityId: 'exception-routing', role: null, inputs: ['summary'], outputs: ['status'] },
    },
  },
]
