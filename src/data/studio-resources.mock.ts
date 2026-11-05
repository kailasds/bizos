/**
 * Mock resource catalogue that Application Studio "discovers" during Compose.
 * Ids reuse the fixtures in platform.mock.ts where the resource already exists there.
 * The source platforms remain the owners; the OS only reads these entries.
 */

import type { ResourceKind, ResourceOwner } from '@/app/blueprint/types'
import type { DomainId } from '@/app/registry/types'

export interface CatalogueResource {
  id: string
  name: string
  version: string
  kind: ResourceKind
  owner: ResourceOwner
  capabilityIds: string[]
  domains: DomainId[] | 'all'
  /** `restricted` = usable, but needs an extra approval or policy check. */
  availability: 'available' | 'restricted' | 'planned'
  note: string
}

export const resourceCatalogue: CatalogueResource[] = [
  // Agents — Agent Control Plane
  { id: 'AGT-intake', name: 'Intake Agent', version: '1.8.0', kind: 'agent', owner: 'Agent Control Plane', capabilityIds: ['claim-intake'], domains: ['insurance'], availability: 'available', note: 'Captures first notice of loss; output matches the claim record.' },
  { id: 'AGT-classifier', name: 'Document Classifier', version: '3.0.2', kind: 'agent', owner: 'Agent Control Plane', capabilityIds: ['request-intake', 'application-intake'], domains: 'all', availability: 'available', note: 'Classifies incoming requests and attachments; certified for all three domains.' },
  { id: 'AGT-kyc', name: 'KYC Checker', version: '0.7.0', kind: 'agent', owner: 'Agent Control Plane', capabilityIds: ['kyc-check'], domains: ['banking'], availability: 'restricted', note: 'Restricted: use requires a compliance approval in the Agent Control Plane.' },

  // Workers — AI Workers Platform
  { id: 'WRK-doc-extract', name: 'Document Extraction Worker', version: '1.4.0', kind: 'worker', owner: 'AI Workers Platform', capabilityIds: ['document-extraction'], domains: 'all', availability: 'available', note: 'Extracts structured fields from PDFs, photos and spreadsheets.' },
  { id: 'WRK-coverage', name: 'Coverage Analyst Worker', version: '2.0.1', kind: 'worker', owner: 'AI Workers Platform', capabilityIds: ['coverage-validation'], domains: ['insurance'], availability: 'available', note: 'Checks the claim against policy cover and explains the result.' },
  { id: 'WRK-fraud-signals', name: 'Fraud Signals Worker', version: '0.9.2', kind: 'worker', owner: 'AI Workers Platform', capabilityIds: ['fraud-assessment'], domains: ['insurance'], availability: 'available', note: 'Flags fraud indicators. Does not assemble investigation case files.' },
  { id: 'WRK-settlement', name: 'Settlement Drafting Worker', version: '1.1.0', kind: 'worker', owner: 'AI Workers Platform', capabilityIds: ['claim-resolution'], domains: ['insurance'], availability: 'available', note: 'Drafts settlement letters for approved claims.' },
  { id: 'WRK-triage', name: 'Inbox Triage Worker', version: '0.6.3', kind: 'worker', owner: 'AI Workers Platform', capabilityIds: ['task-allocation'], domains: 'all', availability: 'available', note: 'Reused with a claims routing configuration rather than creating a new worker.' },

  // Services — Enterprise AI OS
  { id: 'SVC-approvals', name: 'Approval Service', version: '1.2.0', kind: 'service', owner: 'Enterprise AI OS', capabilityIds: ['human-task'], domains: 'all', availability: 'available', note: 'Human task inbox with approval, referral and audit trail.' },
  { id: 'SVC-routing', name: 'Routing Rules Service', version: '1.0.0', kind: 'service', owner: 'Enterprise AI OS', capabilityIds: ['risk-routing'], domains: 'all', availability: 'available', note: 'Deterministic rules decide where each case goes next.' },
  { id: 'SVC-notify', name: 'Notification Service', version: '1.0.0', kind: 'service', owner: 'Enterprise AI OS', capabilityIds: ['decision-notification'], domains: 'all', availability: 'available', note: 'Sends status updates to customers and staff.' },
  { id: 'SVC-observability', name: 'Outcome Monitoring', version: '0.3.0', kind: 'service', owner: 'Enterprise AI OS', capabilityIds: ['outcome-monitoring'], domains: 'all', availability: 'available', note: 'Tracks workflow outcomes and human interventions per application.' },

  // Connectors — integration infrastructure
  { id: 'CON-policy', name: 'Policy administration connector', version: '2.3.0', kind: 'connector', owner: 'Integration infrastructure', capabilityIds: ['claims-system-access'], domains: ['insurance'], availability: 'available', note: 'Reads policies and writes claim status to PolicyCore (REST API).' },
  { id: 'CON-payments', name: 'Claims payments connector', version: '1.6.0', kind: 'connector', owner: 'Integration infrastructure', capabilityIds: ['payments-access'], domains: ['insurance'], availability: 'available', note: 'Issues approved payments through PayHub (REST API).' },
  { id: 'CON-provider', name: 'Provider records connector', version: '1.1.0', kind: 'connector', owner: 'Integration infrastructure', capabilityIds: ['provider-records-access', 'eligibility-check'], domains: ['healthcare'], availability: 'available', note: 'Receives provider records and checks member eligibility (SFTP).' },
  { id: 'CON-core-banking', name: 'Core banking connector', version: '3.0.0', kind: 'connector', owner: 'Integration infrastructure', capabilityIds: ['banking-system-access'], domains: ['banking'], availability: 'available', note: 'Reads customer accounts and books approved facilities (REST API).' },

  // Domain knowledge — Domain Intelligence Kernel
  { id: 'DP-insurance', name: 'Insurance domain pack', version: '0.1.0-draft', kind: 'knowledge', owner: 'Domain Intelligence Kernel', capabilityIds: ['insurance-knowledge'], domains: ['insurance'], availability: 'available', note: 'Draft ontology, claims process library and coverage rules.' },
  { id: 'DP-healthcare', name: 'Healthcare domain pack', version: '—', kind: 'knowledge', owner: 'Domain Intelligence Kernel', capabilityIds: ['healthcare-knowledge'], domains: ['healthcare'], availability: 'planned', note: 'Planned — not yet built. Clinical terminology will be limited.' },
  { id: 'DP-banking', name: 'Banking domain pack', version: '—', kind: 'knowledge', owner: 'Domain Intelligence Kernel', capabilityIds: ['banking-knowledge'], domains: ['banking'], availability: 'planned', note: 'Planned — not yet built. Lending rules must come from the bank.' },
]

/** Proposed worker compositions for capabilities no existing resource covers. */
export interface WorkerProposal {
  capabilityId: string
  name: string
  purpose: string
  whyNeeded: string
  skills: string[]
  /** Existing agents the worker would be allowed to call. */
  agentAccess: string[]
  knowledge: string[]
  /** Existing resources checked first, and why they don't fit. */
  reuseChecked: { resource: string; reason: string }[]
}

export const workerProposals: WorkerProposal[] = [
  {
    capabilityId: 'fraud-investigation',
    name: 'Fraud Investigation Worker',
    purpose: 'Assembles an investigation case file for flagged claims: gathers evidence, links prior claims and drafts questions for the investigator.',
    whyNeeded: 'The selected approach investigates flagged claims before a person reviews them. Without it, every flagged claim waits for an investigator to start from scratch.',
    skills: ['Collect claim evidence', 'Link related claims and parties', 'Summarise fraud indicators', 'Draft investigator questions'],
    agentAccess: ['Case Summariser 1.2.0', 'Document Classifier 3.0.2'],
    knowledge: ['Insurance domain pack 0.1.0-draft — fraud indicators'],
    reuseChecked: [
      { resource: 'Fraud Signals Worker 0.9.2', reason: 'Flags indicators but cannot gather evidence or build a case file.' },
      { resource: 'Claims Investigation Worker 0.1.0', reason: 'Still in validation on the AI Workers Platform; not yet usable.' },
    ],
  },
  {
    capabilityId: 'clinical-criteria-review',
    name: 'Clinical Criteria Worker',
    purpose: 'Compares a prior-authorization request against the payer’s clinical criteria and lists what is met, unmet or missing.',
    whyNeeded: 'Reviewers need the criteria check prepared before they decide. No existing worker reads clinical criteria.',
    skills: ['Match request to criteria', 'List missing clinical evidence', 'Draft reviewer summary'],
    agentAccess: ['Document Classifier 3.0.2', 'Case Summariser 1.2.0'],
    knowledge: ['Payer clinical criteria (supplied by the organisation)'],
    reuseChecked: [{ resource: 'Document Extraction Worker 1.4.0', reason: 'Reads documents but does not evaluate criteria.' }],
  },
  {
    capabilityId: 'cash-flow-analysis',
    name: 'Cash-flow Analysis Worker',
    purpose: 'Reads bank statements and management accounts and summarises the applicant’s cash-flow position for the credit officer.',
    whyNeeded: 'Credit officers currently rebuild cash-flow summaries by hand for every application.',
    skills: ['Categorise transactions', 'Summarise monthly cash flow', 'Highlight irregular patterns'],
    agentAccess: ['Document Classifier 3.0.2', 'Case Summariser 1.2.0'],
    knowledge: ['Bank lending policy (supplied by the organisation)'],
    reuseChecked: [{ resource: 'Document Extraction Worker 1.4.0', reason: 'Extracts statement lines but does not analyse them.' }],
  },
]

/** The simulated composition sequence shown after the user approves a proposal. */
export const compositionSequence = [
  'Composition request sent to AI Workers Platform',
  'Composing from approved agents and skills',
  'Attaching domain knowledge',
  'Running validation tests',
  'Waiting for deployment readiness',
]
