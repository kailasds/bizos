/**
 * MOCK — deterministic scenarios behind Application Studio's simulated intelligence.
 * Nothing here is produced by a model: the mock intent, architecture and capability
 * services (src/app/services/mock/) select and assemble these fixtures according to
 * what the user wrote and decided. Descriptions that match none of these scenarios
 * get an honest fallback instead of a pretend understanding.
 */

import type { DataEntity, FieldOption, SampleRecord } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'
import type { StudioScenario } from '@/app/studio/types'
import { claims } from './claims.mock'

const levelOptions: FieldOption[] = [
  { value: 'low', label: 'Low', tone: 'neutral' },
  { value: 'medium', label: 'Medium', tone: 'warning' },
  { value: 'high', label: 'High', tone: 'danger' },
]

// ── Insurance: claims processing (primary demonstration) ────────────────

const claimEntity: DataEntity = {
  id: 'claim',
  name: 'Claim',
  pluralName: 'Claims',
  titleField: 'claimant',
  fields: [
    { id: 'claimant', label: 'Claimant', type: 'text' },
    { id: 'policyNumber', label: 'Policy', type: 'text' },
    { id: 'product', label: 'Product', type: 'text' },
    { id: 'lossType', label: 'Loss', type: 'text' },
    { id: 'amount', label: 'Claimed', type: 'money' },
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'new', label: 'New', tone: 'info' },
        { value: 'in-review', label: 'In review', tone: 'info' },
        { value: 'investigation', label: 'Investigation', tone: 'warning' },
        { value: 'awaiting-approval', label: 'Awaiting approval', tone: 'warning' },
        { value: 'resolved', label: 'Resolved', tone: 'success' },
      ],
    },
    { id: 'risk', label: 'Risk', type: 'level', options: levelOptions },
    { id: 'reportedAt', label: 'Reported', type: 'date' },
    { id: 'summary', label: 'Summary', type: 'longtext' },
  ],
}

const claimStatus: Record<string, string> = {
  intake: 'new',
  coverage: 'in-review',
  'fraud-screening': 'investigation',
  assessment: 'in-review',
  'awaiting-approval': 'awaiting-approval',
  settled: 'resolved',
  referred: 'investigation',
}

const claimRecords: SampleRecord[] = claims.map((c) => ({
  id: c.id,
  claimant: c.claimant,
  policyNumber: c.policyNumber,
  product: c.product,
  lossType: c.lossType,
  amount: c.amount,
  status: claimStatus[c.stage],
  risk: c.risk,
  reportedAt: c.reportedAt,
  summary: c.summary,
}))

const approverCandidates = ['claims-adjuster', 'claims-manager']

const insuranceClaims: StudioScenario = {
  id: 'insurance-claims',
  domain: 'insurance',
  label: 'Claims processing',
  defaultName: 'Claims Processing Hub',
  description: 'Processes insurance claims from first notice of loss to a decision, screens for fraud and routes complex cases to people.',
  iconKey: 'claims',
  tint: 'blue',
  examplePrompt:
    'I want an application that helps insurance teams process claims, detect potential fraud and route complex cases for human review.',
  domainKeywords: ['claim', 'insur', 'policy', 'fraud', 'underwrit', 'loss', 'fnol', 'premium'],
  summary: {
    base: 'an application that takes insurance claims from first notice of loss to a decision with less manual handling',
    clauses: {
      'int-fraud': 'checks each claim for potential fraud',
      'int-route': 'sends complex or sensitive cases to the right person',
    },
  },
  interpretation: [
    { id: 'int-intake', text: 'Capture and validate new claims, including the documents that support them.', capabilityIds: ['claim-intake', 'document-extraction', 'coverage-validation'] },
    { id: 'int-fraud', text: 'Identify potential fraud indicators and investigate flagged claims.', capabilityIds: ['fraud-assessment'], keywords: ['fraud', 'suspicious'] },
    { id: 'int-route', text: 'Route complex cases to human reviewers.', capabilityIds: ['human-review'], keywords: ['route', 'review', 'human', 'complex', 'escalat', 'approv', 'manual', 'intervention'] },
    { id: 'int-decide', text: 'Decide claims and tell customers the outcome.', capabilityIds: ['claim-decision', 'correspondence'] },
  ],
  objective:
    'Resolve insurance claims faster and more consistently, while making sure suspicious or complex claims get the right human attention before money is paid.',
  problem: 'Claims handlers re-key information from documents, apply fraud checks inconsistently and spend time on straightforward claims that could be decided by agreed rules.',
  users: [
    { id: 'claims-adjuster', label: 'Claims adjusters', description: 'Handle day-to-day claims and gather missing information.' },
    { id: 'claims-manager', label: 'Claims managers', description: 'Approve high-value or complex settlements and oversee the queue.' },
    { id: 'fraud-investigator', label: 'Fraud investigators', description: 'Investigate claims that show fraud indicators.' },
  ],
  processes: [
    { id: 'proc-fnol', label: 'First notice of loss' },
    { id: 'proc-coverage', label: 'Coverage and policy check' },
    { id: 'proc-fraud', label: 'Fraud screening and investigation' },
    { id: 'proc-settle', label: 'Settlement decision and payment' },
    { id: 'proc-letters', label: 'Customer correspondence' },
  ],
  challenges: [
    { id: 'ch-rekey', label: 'Claim details are re-keyed by hand from documents' },
    { id: 'ch-fraud', label: 'Fraud checks vary from handler to handler' },
    { id: 'ch-chasing', label: 'Customers chase for status updates' },
  ],
  integrations: [
    { id: 'int-policycore', label: 'Policy administration system (PolicyCore)' },
    { id: 'int-payhub', label: 'Payments system (PayHub)' },
    { id: 'int-dms', label: 'Document repository' },
  ],
  capabilities: [
    { id: 'cap-intake', label: 'FNOL processing', capabilityId: 'claim-intake', description: 'Capture a first notice of loss with the details needed to start a claim.' },
    { id: 'cap-extract', label: 'Document extraction', capabilityId: 'document-extraction', description: 'Read estimates, invoices and reports and pull out the key details.' },
    { id: 'cap-coverage', label: 'Coverage validation', capabilityId: 'coverage-validation', description: 'Check the loss against what the policy covers.' },
    { id: 'cap-fraud', label: 'Fraud assessment', capabilityId: 'fraud-assessment', description: 'Look for indicators that a claim may not be genuine, and investigate them.' },
    { id: 'cap-review', label: 'Human approval', capabilityId: 'human-review', description: 'Send complex or sensitive decisions to the right person.' },
    { id: 'cap-decide', label: 'Claims decision', capabilityId: 'claim-decision', description: 'Settle, refer or decline the claim with a recorded reason.' },
    { id: 'cap-letters', label: 'Correspondence generation', capabilityId: 'correspondence', description: 'Draft settlement, decline and information-request letters.' },
  ],
  inputs: [
    { id: 'in-fnol', label: 'First notice of loss from customer or broker' },
    { id: 'in-docs', label: 'Supporting documents (estimates, photos, reports)' },
    { id: 'in-policy', label: 'Policy and cover details' },
  ],
  outputs: [
    { id: 'out-decision', label: 'Claims decision with reasons' },
    { id: 'out-referral', label: 'Referral to investigation when needed' },
    { id: 'out-letters', label: 'Letters to the customer' },
  ],
  constraints: [
    { id: 'con-approval', label: 'Human approval for sensitive decisions' },
    { id: 'con-access', label: 'Appropriate access permissions by role' },
    { id: 'con-audit', label: 'Auditability of every decision' },
    { id: 'con-trace', label: 'Traceability from decision back to evidence' },
  ],
  successCriteria: [
    { id: 'sc-cycle', label: 'Claim cycle time goes down compared with today' },
    { id: 'sc-touch', label: 'Fewer hand-offs for straightforward claims' },
    { id: 'sc-fraud', label: 'Suspicious claims are reviewed before payment' },
  ],
  evidence: {
    'claims-adjuster': ['team', 'handler', 'adjuster'],
    'claims-manager': ['manager', 'approv'],
    'fraud-investigator': ['fraud', 'investigat'],
    'ch-rekey': ['manual', 'automat'],
    'ch-fraud': ['fraud'],
    'con-approval': ['human', 'review', 'approv'],
    'sc-touch': ['manual', 'intervention', 'automat'],
    'sc-fraud': ['fraud'],
  },
  suggestions: [
    {
      id: 'sug-fraud',
      kind: 'capability',
      list: 'capabilities',
      text: 'Screen claims for potential fraud before payment.',
      capabilityIds: ['fraud-assessment'],
      reason: 'Automating claims without a fraud check increases the chance of paying a suspicious claim. Most claims operations screen every claim.',
    },
    {
      id: 'sug-notify',
      kind: 'output',
      list: 'outputs',
      text: 'Ask customers for missing information automatically',
      reason: 'Claims usually stall waiting for customers. You did not mention how they are told what is missing.',
    },
    {
      id: 'sug-retention',
      kind: 'constraint',
      list: 'constraints',
      text: 'Retain claim documents for the regulatory period',
      reason: 'Insurance records normally have a retention requirement. Your organisation’s period should be confirmed.',
    },
  ],
  questions: [
    {
      id: 'q-scope',
      text: 'Which claims should the first version handle?',
      why: 'A narrower first scope means fewer rules to agree before launch.',
      options: [
        { id: 'motor-home', label: 'Motor and home', effect: { kind: 'add', itemKind: 'constraint', text: 'First version handles motor and home claims' } },
        { id: 'personal', label: 'All personal lines', effect: { kind: 'add', itemKind: 'constraint', text: 'First version handles all personal lines claims' } },
        { id: 'commercial', label: 'Including commercial', effect: { kind: 'add', itemKind: 'constraint', text: 'First version includes commercial property claims' } },
      ],
    },
    {
      id: 'q-approver',
      text: 'Who should approve settlements that need a human decision?',
      why: 'More than one user group could decide. If you do not choose, I will not guess — validation will ask again.',
      options: [
        { id: 'manager', label: 'Claims managers', effect: { kind: 'approver', role: 'claims-manager' } },
        { id: 'adjuster', label: 'Claims adjusters', effect: { kind: 'approver', role: 'claims-adjuster' } },
      ],
    },
    {
      id: 'q-updates',
      text: 'Should customers get automatic status updates?',
      why: 'Status updates reduce customers chasing, but every message needs approved wording.',
      options: [
        { id: 'yes', label: 'Yes', effect: { kind: 'add', itemKind: 'output', text: 'Automatic status updates to customers' } },
        { id: 'no', label: 'Not in the first version', effect: { kind: 'none' } },
      ],
    },
  ],
  options: [
    {
      id: 'opt-assisted',
      name: 'Assisted Claims Processing',
      tagline: 'People lead every claim; automation prepares the paperwork.',
      operatingModel: 'People decide every claim. Automation captures, reads and checks it first.',
      howItAddresses: 'Removes re-keying and makes coverage checks consistent, while every fraud review and decision stays with a person.',
      summary: 'Automates intake, document extraction and coverage checks. Fraud investigators review indicators themselves and a person decides every claim.',
      automation: 'assisted',
      steps: [
        { id: 'st-intake', name: 'Capture FNOL', actor: 'automated', capabilityId: 'claim-intake' },
        { id: 'st-extract', name: 'Extract documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-coverage', name: 'Validate coverage', actor: 'automated', capabilityId: 'coverage-validation' },
        { id: 'st-fraud-review', name: 'Review fraud indicators', actor: 'human', capabilityId: 'fraud-assessment', role: 'fraud-investigator', requires: 'fraud-assessment' },
        { id: 'st-decide', name: 'Decide the claim', actor: 'human', capabilityId: 'claim-decision', role: null, roleCandidates: approverCandidates },
        { id: 'st-letters', name: 'Draft correspondence', actor: 'automated', capabilityId: 'correspondence' },
      ],
      supportingCapabilities: ['claims-system-access', 'insurance-knowledge'],
      humanReview: ['Every claim with fraud indicators', 'Every claims decision'],
      benefits: ['Uses only resources that exist today', 'Smallest change to how teams work now'],
      tradeOffs: ['Investigators start each fraud review from scratch', 'Straightforward claims still wait for a person'],
      dependencies: ['Policy administration connector', 'Insurance domain pack (draft)'],
    },
    {
      id: 'opt-orchestrated',
      name: 'AI-Driven Claims Automation',
      tagline: 'Straightforward claims are decided by agreed rules; people handle exceptions.',
      operatingModel: 'Automation handles routine claims end to end. People handle the exceptions it routes to them.',
      howItAddresses: 'Cuts hand-offs on routine claims and gives investigators a prepared case file, so people spend their time on the claims that need judgement.',
      summary: 'Extracts and validates automatically, screens and investigates fraud indicators, decides straightforward claims by agreed rules, and routes exceptions to a person for approval.',
      automation: 'balanced',
      steps: [
        { id: 'st-intake', name: 'Capture FNOL', actor: 'automated', capabilityId: 'claim-intake' },
        { id: 'st-extract', name: 'Extract documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-coverage', name: 'Validate coverage', actor: 'automated', capabilityId: 'coverage-validation' },
        { id: 'st-screen', name: 'Screen fraud signals', actor: 'automated', capabilityId: 'fraud-assessment', requires: 'fraud-assessment' },
        { id: 'st-investigate', name: 'Prepare investigation', actor: 'automated', capabilityId: 'fraud-investigation', requires: 'fraud-assessment' },
        { id: 'st-route', name: 'Route by risk', actor: 'system', capabilityId: 'risk-routing' },
        { id: 'st-rules-decide', name: 'Decide routine claims', actor: 'system', capabilityId: 'claim-decision' },
        { id: 'st-approve', name: 'Approve exceptions', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: approverCandidates },
        { id: 'st-letters', name: 'Draft correspondence', actor: 'automated', capabilityId: 'correspondence' },
      ],
      supportingCapabilities: ['claims-system-access', 'insurance-knowledge'],
      humanReview: ['Claims routed as complex or high risk', 'Settlements above handler authority'],
      benefits: ['Straightforward claims need no manual hand-offs', 'Investigators receive a prepared case file'],
      tradeOffs: ['Needs one new worker to prepare investigations', 'Routing thresholds must be agreed with claims managers'],
      dependencies: ['Policy administration connector', 'Insurance domain pack (draft)', 'New: fraud investigation capability'],
      recommended: { reason: 'It covers every capability you confirmed, including fraud assessment and human approval, with one new resource.' },
    },
    {
      id: 'opt-end-to-end',
      name: 'Intelligent Claims Operations',
      tagline: 'A managed claims operation: work is allocated, monitored and paid automatically.',
      operatingModel: 'The OS runs the claims operation. People supervise at defined checkpoints and act on what monitoring shows.',
      howItAddresses: 'Goes beyond individual claims: work is allocated to the right people, payments are issued automatically and outcomes are monitored so bottlenecks are visible.',
      summary: 'Everything in AI-Driven Claims Automation, plus automatic work allocation, payment through the payments system and continuous monitoring of outcomes.',
      automation: 'extensive',
      steps: [
        { id: 'st-intake', name: 'Capture FNOL', actor: 'automated', capabilityId: 'claim-intake' },
        { id: 'st-allocate', name: 'Allocate work', actor: 'system', capabilityId: 'task-allocation' },
        { id: 'st-extract', name: 'Extract documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-coverage', name: 'Validate coverage', actor: 'automated', capabilityId: 'coverage-validation' },
        { id: 'st-screen', name: 'Screen fraud signals', actor: 'automated', capabilityId: 'fraud-assessment', requires: 'fraud-assessment' },
        { id: 'st-investigate', name: 'Prepare investigation', actor: 'automated', capabilityId: 'fraud-investigation', requires: 'fraud-assessment' },
        { id: 'st-route', name: 'Route by risk', actor: 'system', capabilityId: 'risk-routing' },
        { id: 'st-approve', name: 'Approve at checkpoints', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: approverCandidates },
        { id: 'st-pay', name: 'Settle and pay', actor: 'system', capabilityId: 'claim-decision' },
        { id: 'st-letters', name: 'Draft correspondence', actor: 'automated', capabilityId: 'correspondence' },
        { id: 'st-monitor', name: 'Monitor outcomes', actor: 'system', capabilityId: 'outcome-monitoring' },
      ],
      supportingCapabilities: ['claims-system-access', 'payments-access', 'insurance-knowledge'],
      humanReview: ['Defined checkpoints: high risk, high value, customer complaints'],
      benefits: ['Fewest manual steps across the whole claim', 'Bottlenecks and interventions are visible'],
      tradeOffs: ['Largest change to how teams work', 'Needs a new worker, the payments connector and an allocation configuration', 'More rules to agree before launch'],
      dependencies: ['Policy administration connector', 'Claims payments connector', 'Insurance domain pack (draft)', 'New: fraud investigation capability'],
    },
  ],
  capabilityLabels: {
    'fraud-investigation': 'Fraud investigation',
    'risk-routing': 'Risk-based routing',
    'task-allocation': 'Work allocation',
    'outcome-monitoring': 'Outcome monitoring',
    'claims-system-access': 'Claim system access',
    'payments-access': 'Payments access',
    'insurance-knowledge': 'Insurance domain knowledge',
    'human-task': 'Human approval',
  },
  contracts: {
    'claim-intake': { inputs: [], outputs: ['claimant', 'policyNumber', 'product', 'lossType', 'amount', 'reportedAt', 'summary'] },
    'document-extraction': { inputs: ['summary'], outputs: ['lossType', 'amount'] },
    'coverage-validation': { inputs: ['policyNumber', 'lossType', 'amount'], outputs: ['status'] },
    'fraud-assessment': { inputs: ['claimant', 'amount', 'lossType'], outputs: ['risk'] },
    'fraud-investigation': { inputs: ['risk', 'summary'], outputs: ['status'] },
    'risk-routing': { inputs: ['risk', 'amount'], outputs: ['status'] },
    'human-review': { inputs: ['amount', 'risk', 'summary'], outputs: ['status'] },
    'claim-decision': { inputs: ['amount', 'status'], outputs: ['status'] },
    correspondence: { inputs: ['claimant', 'status'], outputs: [] },
    'task-allocation': { inputs: ['product', 'risk'], outputs: ['status'] },
    'outcome-monitoring': { inputs: ['status'], outputs: [] },
  },
  entity: claimEntity,
  pages: [
    {
      id: 'page-workspace',
      title: 'Claims workspace',
      purpose: 'See every claim, its status and risk, and open one to work on it.',
      roles: ['claims-adjuster', 'claims-manager'],
      components: [
        { id: 'cmp-queue', type: 'work-queue', title: 'All claims', columns: ['claimant', 'product', 'amount', 'status', 'risk'] },
        { id: 'cmp-detail', type: 'record-detail', fields: ['policyNumber', 'lossType', 'reportedAt', 'summary'], showWorkflow: true },
      ],
    },
    {
      id: 'page-new',
      title: 'New claim',
      purpose: 'Capture a first notice of loss.',
      roles: ['claims-adjuster'],
      requires: 'claim-intake',
      components: [{ id: 'cmp-intake', type: 'intake-form', title: 'Report a claim', fields: ['claimant', 'policyNumber', 'product', 'lossType', 'amount', 'summary'] }],
    },
    {
      id: 'page-investigation',
      title: 'Investigation workspace',
      purpose: 'Work through claims with fraud indicators and record findings.',
      roles: ['fraud-investigator'],
      requires: 'fraud-assessment',
      components: [
        { id: 'cmp-inv-queue', type: 'work-queue', title: 'Under investigation', columns: ['claimant', 'amount', 'risk'], filter: { field: 'status', values: ['investigation'] } },
        { id: 'cmp-inv-detail', type: 'record-detail', fields: ['lossType', 'summary'], showWorkflow: false },
        // Bound to a field the generated data model does not contain — surfaced by validation.
        { id: 'cmp-notes', type: 'notes-panel', title: 'Investigation notes', field: 'investigationNotes' },
      ],
    },
    {
      id: 'page-approvals',
      title: 'Approvals',
      purpose: 'Decide claims that need human approval.',
      roles: ['claims-manager'],
      components: [{ id: 'cmp-approvals', type: 'approval-queue', title: 'Awaiting decision', columns: ['claimant', 'amount', 'risk'], statusValue: 'awaiting-approval' }],
    },
    {
      id: 'page-operations',
      title: 'Operations overview',
      purpose: 'See where claims are in the operation and which ones are waiting on people.',
      roles: ['claims-manager'],
      requires: 'outcome-monitoring',
      components: [{ id: 'cmp-ops-queue', type: 'work-queue', title: 'Claims by status', columns: ['claimant', 'status', 'risk', 'amount'] }],
    },
  ],
  sampleRecords: claimRecords,
  evaluations: [
    { id: 'ev-simple', name: 'Straightforward motor claim', given: 'Covered loss, low risk, complete documents', expect: 'Reaches a decision without a manual hand-off' },
    { id: 'ev-fraud', name: 'Claim with fraud indicators', given: 'Three fraud signals present', expect: 'Routed to investigation before any payment' },
    { id: 'ev-authority', name: 'High-value settlement', given: 'Amount above handler authority', expect: 'Requires approval by the assigned approver role' },
  ],
}

// ── Healthcare: prior authorization ─────────────────────────────────────

const authEntity: DataEntity = {
  id: 'authorization',
  name: 'Authorization request',
  pluralName: 'Authorization requests',
  titleField: 'member',
  fields: [
    { id: 'member', label: 'Member', type: 'text' },
    { id: 'provider', label: 'Provider', type: 'text' },
    { id: 'procedure', label: 'Procedure', type: 'text' },
    { id: 'receivedAt', label: 'Received', type: 'date' },
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'new', label: 'New', tone: 'info' },
        { value: 'criteria-review', label: 'Criteria review', tone: 'info' },
        { value: 'awaiting-approval', label: 'Awaiting decision', tone: 'warning' },
        { value: 'decided', label: 'Decided', tone: 'success' },
      ],
    },
    { id: 'urgency', label: 'Urgency', type: 'level', options: levelOptions },
    { id: 'summary', label: 'Clinical summary', type: 'longtext' },
  ],
}

const clinicalCandidates = ['clinical-reviewer', 'medical-director']

const healthcarePriorAuth: StudioScenario = {
  id: 'healthcare-prior-auth',
  domain: 'healthcare',
  label: 'Prior authorization',
  defaultName: 'Prior Authorization Desk',
  description: 'Receives prior-authorization requests, checks eligibility and medical necessity, and routes decisions to clinical reviewers.',
  iconKey: 'health',
  tint: 'teal',
  examplePrompt: 'We need to process prior authorization requests from providers faster, check them against clinical criteria and have nurses review anything that does not clearly qualify.',
  domainKeywords: ['patient', 'clinical', 'prior auth', 'authorization', 'provider', 'nurse', 'medical', 'health', 'member'],
  summary: {
    base: 'an application that decides prior-authorization requests sooner',
    clauses: {
      'int-criteria': 'checks each request against medical necessity criteria',
      'int-review': 'keeps a clinician on every request that does not clearly qualify',
    },
  },
  interpretation: [
    { id: 'int-intake', text: 'Receive requests and read the attached clinical documents.', capabilityIds: ['request-intake', 'document-extraction'] },
    { id: 'int-eligibility', text: 'Validate member eligibility.', capabilityIds: ['eligibility-check'] },
    { id: 'int-criteria', text: 'Review medical necessity against clinical criteria.', capabilityIds: ['clinical-criteria-review'], keywords: ['criteria', 'qualif', 'guideline', 'necessity'] },
    { id: 'int-review', text: 'Send unclear requests to a clinical reviewer.', capabilityIds: ['human-review'], keywords: ['review', 'nurse', 'clinician', 'human'] },
    { id: 'int-communicate', text: 'Communicate the decision to the provider and member.', capabilityIds: ['decision-notification'] },
  ],
  objective: 'Decide prior-authorization requests sooner while keeping clinical judgement on every request that does not clearly meet criteria.',
  problem: 'Requests arrive incomplete, reviewers check criteria by hand and providers wait days for a decision.',
  users: [
    { id: 'intake-coordinator', label: 'Intake coordinators', description: 'Receive and complete incoming requests.' },
    { id: 'clinical-reviewer', label: 'Clinical reviewers', description: 'Nurses who review requests against criteria.' },
    { id: 'medical-director', label: 'Medical directors', description: 'Make final decisions on denials.' },
  ],
  processes: [
    { id: 'proc-intake', label: 'Request intake' },
    { id: 'proc-eligibility', label: 'Eligibility check' },
    { id: 'proc-necessity', label: 'Medical necessity review' },
    { id: 'proc-letter', label: 'Decision letter' },
  ],
  challenges: [
    { id: 'ch-incomplete', label: 'Requests arrive without the clinical evidence needed' },
    { id: 'ch-manual', label: 'Criteria are checked by hand for every request' },
  ],
  integrations: [
    { id: 'int-provider', label: 'Provider records (SFTP)' },
    { id: 'int-eligibility-sys', label: 'Member eligibility system' },
  ],
  capabilities: [
    { id: 'cap-intake', label: 'Request intake', capabilityId: 'request-intake', description: 'Receive and classify incoming requests.' },
    { id: 'cap-extract', label: 'Clinical document extraction', capabilityId: 'document-extraction', description: 'Read clinical notes and attachments.' },
    { id: 'cap-eligibility', label: 'Eligibility validation', capabilityId: 'eligibility-check', description: 'Confirm the member is covered for the service.' },
    { id: 'cap-criteria', label: 'Medical necessity review', capabilityId: 'clinical-criteria-review', description: 'Compare the request with the payer’s medical necessity criteria.' },
    { id: 'cap-review', label: 'Human review', capabilityId: 'human-review', description: 'A clinician decides requests that are not clear-cut.' },
    { id: 'cap-communicate', label: 'Decision communication', capabilityId: 'decision-notification', description: 'Send the decision to the provider and member.' },
  ],
  inputs: [
    { id: 'in-request', label: 'Authorization request from provider' },
    { id: 'in-notes', label: 'Clinical notes and attachments' },
  ],
  outputs: [
    { id: 'out-decision', label: 'Authorization decision with reasons' },
    { id: 'out-letter', label: 'Decision letter to provider and member' },
  ],
  constraints: [
    { id: 'con-approval', label: 'Only clinicians may deny a request' },
    { id: 'con-privacy', label: 'Protect patient health information' },
    { id: 'con-audit', label: 'Auditability of every decision' },
  ],
  successCriteria: [
    { id: 'sc-time', label: 'Decision time goes down compared with today' },
    { id: 'sc-complete', label: 'Fewer requests returned for missing information' },
  ],
  evidence: {
    'clinical-reviewer': ['nurse', 'review', 'clinician'],
    'intake-coordinator': ['provider', 'request'],
    'ch-manual': ['faster', 'manual'],
    'con-approval': ['review', 'nurse', 'clinician'],
    'sc-time': ['faster', 'quick', 'sooner'],
  },
  suggestions: [
    {
      id: 'sug-urgent',
      kind: 'constraint',
      list: 'constraints',
      text: 'Urgent requests are decided within the regulatory timeframe',
      reason: 'Urgent requests usually have a shorter deadline. Confirm the timeframe that applies to you.',
    },
    {
      id: 'sug-missing',
      kind: 'output',
      list: 'outputs',
      text: 'Request for missing clinical information',
      reason: 'Incomplete requests are the most common cause of delay.',
    },
  ],
  questions: [
    {
      id: 'q-approver',
      text: 'Who may decide requests that do not clearly meet criteria?',
      why: 'More than one clinical role could decide. If you do not choose, validation will ask again.',
      options: [
        { id: 'reviewer', label: 'Clinical reviewers', effect: { kind: 'approver', role: 'clinical-reviewer' } },
        { id: 'director', label: 'Medical directors', effect: { kind: 'approver', role: 'medical-director' } },
      ],
    },
    {
      id: 'q-urgent',
      text: 'Should urgent (expedited) requests be handled here too?',
      why: 'Expedited requests have shorter deadlines and need their own queue.',
      options: [
        { id: 'yes', label: 'Yes', effect: { kind: 'add', itemKind: 'constraint', text: 'Expedited requests are handled in a separate, faster queue' } },
        { id: 'no', label: 'Not in the first version', effect: { kind: 'none' } },
      ],
    },
  ],
  options: [
    {
      id: 'opt-assisted',
      name: 'Assisted Review',
      tagline: 'Clinicians review every request; the OS prepares the file.',
      operatingModel: 'A clinician reviews and decides every request. Automation gathers and reads the file first.',
      howItAddresses: 'Removes the work of assembling each request, but criteria are still checked by hand.',
      summary: 'Automates intake, extraction and eligibility. Clinical reviewers check criteria and decide each request.',
      automation: 'assisted',
      steps: [
        { id: 'st-intake', name: 'Receive request', actor: 'automated', capabilityId: 'request-intake' },
        { id: 'st-extract', name: 'Read clinical documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-eligibility', name: 'Validate eligibility', actor: 'system', capabilityId: 'eligibility-check' },
        { id: 'st-decide', name: 'Review and decide', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: clinicalCandidates },
        { id: 'st-notify', name: 'Communicate decision', actor: 'system', capabilityId: 'decision-notification' },
      ],
      supportingCapabilities: ['healthcare-knowledge'],
      humanReview: ['Every request'],
      benefits: ['Uses only resources that exist today'],
      tradeOffs: ['Reviewers check criteria by hand for every request'],
      dependencies: ['Provider records connector'],
    },
    {
      id: 'opt-orchestrated',
      name: 'Criteria-First Routing',
      tagline: 'Check criteria automatically; clinicians review only what is unclear.',
      operatingModel: 'Automation prepares a criteria check for every request. Clinicians decide the ones that do not clearly qualify.',
      howItAddresses: 'Reviewers start from a prepared criteria check, and requests that clearly qualify do not wait for a manual review.',
      summary: 'Prepares a medical necessity check for each request and routes it, so reviewers focus on requests that do not clearly qualify.',
      automation: 'balanced',
      steps: [
        { id: 'st-intake', name: 'Receive request', actor: 'automated', capabilityId: 'request-intake' },
        { id: 'st-extract', name: 'Read clinical documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-eligibility', name: 'Validate eligibility', actor: 'system', capabilityId: 'eligibility-check' },
        { id: 'st-criteria', name: 'Check medical necessity', actor: 'automated', capabilityId: 'clinical-criteria-review', requires: 'clinical-criteria-review' },
        { id: 'st-route', name: 'Route by result', actor: 'system', capabilityId: 'risk-routing' },
        { id: 'st-decide', name: 'Review unclear requests', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: clinicalCandidates },
        { id: 'st-notify', name: 'Communicate decision', actor: 'system', capabilityId: 'decision-notification' },
      ],
      supportingCapabilities: ['healthcare-knowledge'],
      humanReview: ['Requests that do not clearly meet criteria', 'Every denial'],
      benefits: ['Reviewers receive a prepared criteria check', 'Clear approvals are not held up'],
      tradeOffs: ['Needs a new worker for medical necessity review', 'Healthcare domain pack is not built yet'],
      dependencies: ['Provider records connector', 'New: medical necessity capability'],
      recommended: { reason: 'It covers the medical necessity review you described while keeping clinicians on every unclear request.' },
    },
    {
      id: 'opt-end-to-end',
      name: 'Managed Authorization Operations',
      tagline: 'Requests are allocated, tracked against deadlines and monitored.',
      operatingModel: 'The OS manages the authorization queue against deadlines. Clinicians decide at checkpoints.',
      howItAddresses: 'Adds deadline-aware allocation and monitoring, so urgent requests are seen first and delays are visible.',
      summary: 'Everything in Criteria-First Routing, plus allocation by urgency and skill, and monitoring of decision times.',
      automation: 'extensive',
      steps: [
        { id: 'st-intake', name: 'Receive request', actor: 'automated', capabilityId: 'request-intake' },
        { id: 'st-allocate', name: 'Allocate by urgency', actor: 'system', capabilityId: 'task-allocation' },
        { id: 'st-extract', name: 'Read clinical documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-eligibility', name: 'Validate eligibility', actor: 'system', capabilityId: 'eligibility-check' },
        { id: 'st-criteria', name: 'Check medical necessity', actor: 'automated', capabilityId: 'clinical-criteria-review', requires: 'clinical-criteria-review' },
        { id: 'st-route', name: 'Route by result', actor: 'system', capabilityId: 'risk-routing' },
        { id: 'st-decide', name: 'Review at checkpoints', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: clinicalCandidates },
        { id: 'st-notify', name: 'Communicate decision', actor: 'system', capabilityId: 'decision-notification' },
        { id: 'st-monitor', name: 'Monitor decision times', actor: 'system', capabilityId: 'outcome-monitoring' },
      ],
      supportingCapabilities: ['healthcare-knowledge'],
      humanReview: ['Requests that do not clearly meet criteria', 'Every denial', 'Requests close to their deadline'],
      benefits: ['Urgent requests are seen first', 'Delays are visible as they happen'],
      tradeOffs: ['Needs a new worker and an allocation configuration', 'Largest change for intake coordinators'],
      dependencies: ['Provider records connector', 'New: medical necessity capability'],
    },
  ],
  capabilityLabels: {
    'risk-routing': 'Routing by criteria result',
    'task-allocation': 'Allocation by urgency',
    'outcome-monitoring': 'Decision-time monitoring',
    'healthcare-knowledge': 'Healthcare domain knowledge',
    'human-task': 'Human review',
  },
  contracts: {
    'request-intake': { inputs: [], outputs: ['member', 'provider', 'procedure', 'receivedAt', 'summary'] },
    'document-extraction': { inputs: ['summary'], outputs: ['procedure'] },
    'eligibility-check': { inputs: ['member'], outputs: ['status'] },
    'clinical-criteria-review': { inputs: ['procedure', 'summary'], outputs: ['urgency', 'status'] },
    'risk-routing': { inputs: ['urgency', 'status'], outputs: ['status'] },
    'human-review': { inputs: ['procedure', 'summary', 'urgency'], outputs: ['status'] },
    'decision-notification': { inputs: ['status'], outputs: [] },
    'task-allocation': { inputs: ['urgency'], outputs: ['status'] },
    'outcome-monitoring': { inputs: ['status'], outputs: [] },
  },
  entity: authEntity,
  pages: [
    {
      id: 'page-queue',
      title: 'Requests',
      purpose: 'All authorization requests and their status.',
      roles: ['intake-coordinator', 'clinical-reviewer'],
      components: [
        { id: 'cmp-queue', type: 'work-queue', title: 'All requests', columns: ['member', 'procedure', 'urgency', 'status'] },
        { id: 'cmp-detail', type: 'record-detail', fields: ['provider', 'receivedAt', 'summary'], showWorkflow: true },
      ],
    },
    {
      id: 'page-new',
      title: 'New request',
      purpose: 'Record a request received by phone or fax.',
      roles: ['intake-coordinator'],
      components: [{ id: 'cmp-intake', type: 'intake-form', title: 'Record a request', fields: ['member', 'provider', 'procedure', 'summary'] }],
    },
    {
      id: 'page-decisions',
      title: 'Decisions',
      purpose: 'Decide requests that need clinical judgement.',
      roles: ['clinical-reviewer', 'medical-director'],
      components: [{ id: 'cmp-approvals', type: 'approval-queue', title: 'Awaiting decision', columns: ['member', 'procedure', 'urgency'], statusValue: 'awaiting-approval' }],
    },
    {
      id: 'page-operations',
      title: 'Operations overview',
      purpose: 'Requests by status, so delays are visible.',
      roles: ['medical-director'],
      requires: 'outcome-monitoring',
      components: [{ id: 'cmp-ops-queue', type: 'work-queue', title: 'Requests by status', columns: ['member', 'status', 'urgency'] }],
    },
  ],
  sampleRecords: [
    { id: 'PA-3301', member: 'Lena Fischer', provider: 'Riverside Orthopaedics', procedure: 'Knee MRI', receivedAt: '04 Nov 2026', status: 'awaiting-approval', urgency: 'medium', summary: 'Persistent knee pain after 6 weeks of physiotherapy.' },
    { id: 'PA-3304', member: 'Marcus Bell', provider: 'Northgate Cardiology', procedure: 'Cardiac CT', receivedAt: '04 Nov 2026', status: 'criteria-review', urgency: 'high', summary: 'Chest pain with abnormal stress test.' },
    { id: 'PA-3309', member: 'Priya Natarajan', provider: 'Lakeside Clinic', procedure: 'Sleep study', receivedAt: '05 Nov 2026', status: 'new', urgency: 'low', summary: 'Suspected sleep apnoea; referral letter attached.' },
    { id: 'PA-3290', member: 'Oliver Grant', provider: 'Riverside Orthopaedics', procedure: 'Hip replacement', receivedAt: '02 Nov 2026', status: 'decided', urgency: 'medium', summary: 'Approved after criteria review.' },
  ],
  evaluations: [
    { id: 'ev-clear', name: 'Request clearly meets criteria', given: 'Eligible member, criteria met', expect: 'Approved without manual criteria check' },
    { id: 'ev-deny', name: 'Request does not meet criteria', given: 'Criteria unmet', expect: 'Decided by a clinician, never automatically denied' },
  ],
}

// ── Banking: SME lending ────────────────────────────────────────────────

const loanEntity: DataEntity = {
  id: 'loan-application',
  name: 'Loan application',
  pluralName: 'Loan applications',
  titleField: 'business',
  fields: [
    { id: 'business', label: 'Business', type: 'text' },
    { id: 'sector', label: 'Sector', type: 'text' },
    { id: 'amount', label: 'Requested', type: 'money' },
    { id: 'submittedAt', label: 'Submitted', type: 'date' },
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'new', label: 'New', tone: 'info' },
        { value: 'checks', label: 'Checks running', tone: 'info' },
        { value: 'awaiting-approval', label: 'Credit decision', tone: 'warning' },
        { value: 'decided', label: 'Decided', tone: 'success' },
      ],
    },
    { id: 'risk', label: 'Risk', type: 'level', options: levelOptions },
    { id: 'summary', label: 'Summary', type: 'longtext' },
  ],
}

const creditCandidates = ['relationship-manager', 'credit-officer']

const bankingSmeLending: StudioScenario = {
  id: 'banking-sme-lending',
  domain: 'banking',
  label: 'SME lending',
  defaultName: 'SME Lending Desk',
  description: 'Onboards small-business loan applications, verifies applicants, assesses risk and routes credit decisions to officers.',
  iconKey: 'lending',
  tint: 'amber',
  examplePrompt: 'Help our business banking team onboard small business loan applications, run KYC checks, analyse cash flow and send credit decisions to an officer.',
  domainKeywords: ['loan', 'lend', 'bank', 'kyc', 'credit', 'account', 'mortgage', 'sme', 'cash flow'],
  summary: {
    base: 'an application that gives small businesses a faster lending decision',
    clauses: {
      'int-kyc': 'verifies the business and its owners',
      'int-cash': 'assesses risk from cash flow',
    },
  },
  interpretation: [
    { id: 'int-intake', text: 'Capture loan applications and read supporting documents.', capabilityIds: ['application-intake', 'document-extraction'] },
    { id: 'int-kyc', text: 'Verify the applicant business and its owners (KYC).', capabilityIds: ['kyc-check'], keywords: ['kyc', 'identity', 'onboard', 'verif'] },
    { id: 'int-cash', text: 'Assess credit risk from the applicant’s cash flow.', capabilityIds: ['cash-flow-analysis'], keywords: ['cash', 'statement', 'affordab', 'risk'] },
    { id: 'int-decision', text: 'Make a credit decision and have an officer approve it.', capabilityIds: ['credit-decision', 'human-review'] },
    { id: 'int-communicate', text: 'Tell the customer the outcome.', capabilityIds: ['decision-notification'] },
  ],
  objective: 'Give small businesses a faster lending decision while credit officers keep responsibility for every credit decision.',
  problem: 'Applications arrive incomplete, officers rebuild cash-flow summaries by hand and customers wait weeks for an answer.',
  users: [
    { id: 'relationship-manager', label: 'Relationship managers', description: 'Own the customer and submit applications.' },
    { id: 'credit-officer', label: 'Credit officers', description: 'Make credit decisions within their mandate.' },
  ],
  processes: [
    { id: 'proc-intake', label: 'Application intake' },
    { id: 'proc-kyc', label: 'Applicant verification (KYC)' },
    { id: 'proc-risk', label: 'Credit risk assessment' },
    { id: 'proc-decision', label: 'Credit decision and approval' },
    { id: 'proc-offer', label: 'Customer offer' },
  ],
  challenges: [
    { id: 'ch-incomplete', label: 'Applications arrive without statements or accounts' },
    { id: 'ch-manual', label: 'Cash-flow summaries are rebuilt by hand' },
  ],
  integrations: [
    { id: 'int-core', label: 'Core banking system' },
    { id: 'int-kyc-sys', label: 'KYC and sanctions screening' },
  ],
  capabilities: [
    { id: 'cap-intake', label: 'Loan application intake', capabilityId: 'application-intake', description: 'Capture and classify the application.' },
    { id: 'cap-extract', label: 'Document extraction', capabilityId: 'document-extraction', description: 'Read statements and accounts.' },
    { id: 'cap-kyc', label: 'Applicant verification', capabilityId: 'kyc-check', description: 'Verify the business and its owners.' },
    { id: 'cap-cash', label: 'Risk assessment', capabilityId: 'cash-flow-analysis', description: 'Assess affordability and risk from cash flow.' },
    { id: 'cap-decide', label: 'Credit decision', capabilityId: 'credit-decision', description: 'Recommend a decision under the bank’s credit policy.' },
    { id: 'cap-review', label: 'Approval', capabilityId: 'human-review', description: 'A credit officer approves the decision.' },
    { id: 'cap-communicate', label: 'Customer communication', capabilityId: 'decision-notification', description: 'Send the offer or decision to the customer.' },
  ],
  inputs: [
    { id: 'in-app', label: 'Loan application and business details' },
    { id: 'in-statements', label: 'Bank statements and management accounts' },
  ],
  outputs: [
    { id: 'out-decision', label: 'Credit decision with conditions' },
    { id: 'out-offer', label: 'Facility offer to the customer' },
  ],
  constraints: [
    { id: 'con-mandate', label: 'Decisions stay within each officer’s credit mandate' },
    { id: 'con-kyc', label: 'No facility before KYC is complete' },
    { id: 'con-audit', label: 'Auditability of every decision' },
  ],
  successCriteria: [
    { id: 'sc-time', label: 'Time to decision goes down compared with today' },
    { id: 'sc-rework', label: 'Fewer applications returned for missing documents' },
  ],
  evidence: {
    'relationship-manager': ['team', 'relationship'],
    'credit-officer': ['officer', 'credit'],
    'ch-manual': ['cash', 'analys'],
    'con-kyc': ['kyc'],
  },
  suggestions: [
    {
      id: 'sug-pricing',
      kind: 'output',
      list: 'outputs',
      text: 'Indicative pricing shared with the relationship manager',
      reason: 'Relationship managers usually need a price to discuss with the customer.',
    },
  ],
  questions: [
    {
      id: 'q-approver',
      text: 'Who approves credit decisions?',
      why: 'More than one role could approve. If you do not choose, validation will ask again.',
      options: [
        { id: 'officer', label: 'Credit officers', effect: { kind: 'approver', role: 'credit-officer' } },
        { id: 'rm', label: 'Relationship managers', effect: { kind: 'approver', role: 'relationship-manager' } },
      ],
    },
    {
      id: 'q-committee',
      text: 'Should applications above an officer’s mandate go to a credit committee?',
      why: 'Large facilities usually need a committee; it changes who must see the file.',
      options: [
        { id: 'yes', label: 'Yes', effect: { kind: 'add', itemKind: 'constraint', text: 'Applications above an officer’s mandate go to the credit committee' } },
        { id: 'no', label: 'No', effect: { kind: 'none' } },
      ],
    },
  ],
  options: [
    {
      id: 'opt-assisted',
      name: 'Assisted Underwriting',
      tagline: 'Prepare the file; officers assess and decide.',
      operatingModel: 'Credit officers assess risk and decide every application. Automation assembles and verifies the file.',
      howItAddresses: 'Removes the work of chasing documents and running KYC, but risk assessment stays manual.',
      summary: 'Automates intake, extraction and verification. Credit officers assess risk and decide.',
      automation: 'assisted',
      steps: [
        { id: 'st-intake', name: 'Capture application', actor: 'automated', capabilityId: 'application-intake' },
        { id: 'st-extract', name: 'Read documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-kyc', name: 'Verify applicant', actor: 'automated', capabilityId: 'kyc-check', requires: 'kyc-check' },
        { id: 'st-decide', name: 'Assess and decide', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: creditCandidates },
        { id: 'st-notify', name: 'Send offer', actor: 'system', capabilityId: 'decision-notification' },
      ],
      supportingCapabilities: ['banking-system-access', 'banking-knowledge'],
      humanReview: ['Every credit decision'],
      benefits: ['Uses only resources that exist today'],
      tradeOffs: ['Officers still build cash-flow summaries by hand'],
      dependencies: ['Core banking connector', 'KYC Checker (restricted)'],
    },
    {
      id: 'opt-orchestrated',
      name: 'Analysed Credit File',
      tagline: 'Risk is assessed automatically; officers approve a recommended decision.',
      operatingModel: 'Automation assesses risk and recommends a decision under credit policy. An officer approves every one.',
      howItAddresses: 'Officers receive a complete, analysed credit file with a policy recommendation, instead of rebuilding it themselves.',
      summary: 'Adds automatic risk assessment and a policy-based recommendation, so officers receive a complete credit file to approve.',
      automation: 'balanced',
      steps: [
        { id: 'st-intake', name: 'Capture application', actor: 'automated', capabilityId: 'application-intake' },
        { id: 'st-extract', name: 'Read documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-kyc', name: 'Verify applicant', actor: 'automated', capabilityId: 'kyc-check', requires: 'kyc-check' },
        { id: 'st-cash', name: 'Assess risk', actor: 'automated', capabilityId: 'cash-flow-analysis', requires: 'cash-flow-analysis' },
        { id: 'st-recommend', name: 'Recommend decision', actor: 'system', capabilityId: 'credit-decision' },
        { id: 'st-decide', name: 'Approve decision', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: creditCandidates },
        { id: 'st-notify', name: 'Send offer', actor: 'system', capabilityId: 'decision-notification' },
      ],
      supportingCapabilities: ['banking-system-access', 'banking-knowledge'],
      humanReview: ['Every credit decision'],
      benefits: ['Officers receive a complete, analysed credit file', 'Decisions follow credit policy consistently'],
      tradeOffs: ['Needs a new risk analysis worker', 'KYC Checker needs a compliance approval'],
      dependencies: ['Core banking connector', 'KYC Checker (restricted)', 'New: risk assessment capability'],
      recommended: { reason: 'It covers the cash-flow risk assessment you described while officers keep every decision.' },
    },
    {
      id: 'opt-end-to-end',
      name: 'Automated Small-Ticket Lending',
      tagline: 'Small loans inside policy are decided automatically; officers take the rest.',
      operatingModel: 'Automation decides small applications that fully meet policy. Officers approve everything above policy limits.',
      howItAddresses: 'The smallest, most standard applications get an answer the same day; officers spend their time on larger or unusual ones.',
      summary: 'Everything in Analysed Credit File, plus automatic decisions within policy limits and monitoring of decision outcomes.',
      automation: 'extensive',
      steps: [
        { id: 'st-intake', name: 'Capture application', actor: 'automated', capabilityId: 'application-intake' },
        { id: 'st-extract', name: 'Read documents', actor: 'automated', capabilityId: 'document-extraction' },
        { id: 'st-kyc', name: 'Verify applicant', actor: 'automated', capabilityId: 'kyc-check', requires: 'kyc-check' },
        { id: 'st-cash', name: 'Assess risk', actor: 'automated', capabilityId: 'cash-flow-analysis', requires: 'cash-flow-analysis' },
        { id: 'st-recommend', name: 'Decide within policy', actor: 'system', capabilityId: 'credit-decision' },
        { id: 'st-decide', name: 'Approve above policy', actor: 'human', capabilityId: 'human-review', role: null, roleCandidates: creditCandidates },
        { id: 'st-notify', name: 'Send offer', actor: 'system', capabilityId: 'decision-notification' },
        { id: 'st-monitor', name: 'Monitor decisions', actor: 'system', capabilityId: 'outcome-monitoring' },
      ],
      supportingCapabilities: ['banking-system-access', 'banking-knowledge'],
      humanReview: ['Applications above policy limits', 'Any application a rule cannot decide'],
      benefits: ['Same-day answers for small, standard applications', 'Decision outcomes are monitored'],
      tradeOffs: ['Credit policy limits must be agreed and signed off', 'Needs a new worker and a compliance approval'],
      dependencies: ['Core banking connector', 'KYC Checker (restricted)', 'New: risk assessment capability'],
    },
  ],
  capabilityLabels: {
    'banking-system-access': 'Core banking access',
    'banking-knowledge': 'Banking domain knowledge',
    'outcome-monitoring': 'Decision monitoring',
    'human-task': 'Human approval',
  },
  contracts: {
    'application-intake': { inputs: [], outputs: ['business', 'sector', 'amount', 'submittedAt', 'summary'] },
    'document-extraction': { inputs: ['summary'], outputs: ['amount'] },
    'kyc-check': { inputs: ['business'], outputs: ['status'] },
    'cash-flow-analysis': { inputs: ['amount', 'summary'], outputs: ['risk'] },
    'credit-decision': { inputs: ['amount', 'risk'], outputs: ['status'] },
    'human-review': { inputs: ['amount', 'risk', 'summary'], outputs: ['status'] },
    'decision-notification': { inputs: ['status'], outputs: [] },
    'outcome-monitoring': { inputs: ['status'], outputs: [] },
  },
  entity: loanEntity,
  pages: [
    {
      id: 'page-pipeline',
      title: 'Pipeline',
      purpose: 'Every application and where it is.',
      roles: ['relationship-manager', 'credit-officer'],
      components: [
        { id: 'cmp-queue', type: 'work-queue', title: 'Applications', columns: ['business', 'sector', 'amount', 'status', 'risk'] },
        { id: 'cmp-detail', type: 'record-detail', fields: ['submittedAt', 'summary'], showWorkflow: true },
      ],
    },
    {
      id: 'page-new',
      title: 'New application',
      purpose: 'Submit an application for a customer.',
      roles: ['relationship-manager'],
      components: [{ id: 'cmp-intake', type: 'intake-form', title: 'Submit an application', fields: ['business', 'sector', 'amount', 'summary'] }],
    },
    {
      id: 'page-decisions',
      title: 'Credit decisions',
      purpose: 'Approve applications within your mandate.',
      roles: ['credit-officer'],
      components: [{ id: 'cmp-approvals', type: 'approval-queue', title: 'Awaiting decision', columns: ['business', 'amount', 'risk'], statusValue: 'awaiting-approval' }],
    },
    {
      id: 'page-operations',
      title: 'Decision monitoring',
      purpose: 'Applications by status, including those decided automatically.',
      roles: ['credit-officer'],
      requires: 'outcome-monitoring',
      components: [{ id: 'cmp-ops-queue', type: 'work-queue', title: 'Applications by status', columns: ['business', 'status', 'risk', 'amount'] }],
    },
  ],
  sampleRecords: [
    { id: 'LN-7720', business: 'Harbour Coffee Roasters', sector: 'Food & drink', amount: 85000, submittedAt: '03 Nov 2026', status: 'awaiting-approval', risk: 'low', summary: 'Second roaster and delivery van; three years of trading.' },
    { id: 'LN-7724', business: 'Kestrel Joinery Ltd', sector: 'Construction', amount: 240000, submittedAt: '04 Nov 2026', status: 'checks', risk: 'medium', summary: 'Workshop purchase; seasonal cash flow.' },
    { id: 'LN-7731', business: 'Brightline Dental', sector: 'Healthcare', amount: 150000, submittedAt: '05 Nov 2026', status: 'new', risk: 'low', summary: 'Equipment refinancing for two practices.' },
  ],
  evaluations: [
    { id: 'ev-kyc', name: 'KYC incomplete', given: 'One owner not verified', expect: 'No credit decision is possible' },
    { id: 'ev-mandate', name: 'Above mandate', given: 'Requested amount above officer mandate', expect: 'Requires approval by the assigned approver role' },
  ],
}

export const studioScenarios: StudioScenario[] = [insuranceClaims, healthcarePriorAuth, bankingSmeLending]

export const scenarioForDomain = (domain: DomainId): StudioScenario =>
  studioScenarios.find((s) => s.domain === domain) ?? insuranceClaims

export const getScenario = (id: string | null): StudioScenario | null => studioScenarios.find((s) => s.id === id) ?? null
