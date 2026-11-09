/**
 * MOCK — the single resource catalogue for the prototype.
 *
 * Represents records owned by other platforms (Agent Control Plane, AI Workers
 * Platform, integration infrastructure, Domain Intelligence Kernel). The OS only
 * reads them; it is not a second agent or worker registry. Every value, including
 * the simulated runtime state, is fabricated.
 */

import type { ResourceKind, ResourceOwner } from '@/app/blueprint/types'
import type { AppId, DomainId } from '@/app/registry/types'

export type ResourceAvailability = 'available' | 'restricted' | 'validating' | 'planned'

export interface PlatformResource {
  id: string
  name: string
  kind: ResourceKind
  owner: ResourceOwner
  version: string
  capabilityIds: string[]
  domains: DomainId[] | 'all'
  availability: ResourceAvailability
  /** One line shown beside the resource wherever it is matched to a need. */
  note: string
  /** Business-facing description — shown first. */
  purpose: string
  responsibilities: string[]
  dependencies: string[]
  /** Present when using the resource needs a business decision first. */
  configuration?: string
  /** Simulated runtime state (workers only). */
  runtime?: { state: 'busy' | 'idle' | 'validating'; currentTask?: string; appId?: AppId }
  /** Technical details — shown only on request. */
  technical: {
    endpoint: string
    contract: { inputs: string[]; outputs: string[] }
    lastValidated: string
    protocol?: string
    system?: string
    certifiedDomains?: string[]
  }
}

/** Alias kept for code written against the Milestone 2 catalogue. */
export type CatalogueResource = PlatformResource

export const platformResources: PlatformResource[] = [
  // ── Agents (Agent Control Plane) ─────────────────────────────────────
  {
    id: 'AGT-intake', name: 'Intake Agent', kind: 'agent', owner: 'Agent Control Plane', version: '1.8.0',
    capabilityIds: ['claim-intake'], domains: ['insurance'], availability: 'available',
    note: 'Captures first notice of loss; output matches the claim record.',
    purpose: 'Takes a first notice of loss from a customer or broker and turns it into a complete claim record.',
    responsibilities: ['Capture loss details and policy reference', 'Ask for missing mandatory information', 'Classify the type of loss'],
    dependencies: ['Policy administration connector'],
    technical: { endpoint: 'mock://acp/agents/AGT-intake', contract: { inputs: ['Customer report'], outputs: ['Claim record'] }, lastValidated: '2026-10-28', certifiedDomains: ['Insurance'] },
  },
  {
    id: 'AGT-assessment', name: 'Assessment Agent', kind: 'agent', owner: 'Agent Control Plane', version: '2.1.0',
    capabilityIds: ['damage-assessment'], domains: ['insurance'], availability: 'available',
    note: 'Estimates damage from photos and estimates.',
    purpose: 'Estimates the cost of damage from photos, estimates and adjuster reports.',
    responsibilities: ['Compare repair estimates with expected ranges', 'Flag estimates that need a loss adjuster'],
    dependencies: ['Document Extraction Worker'],
    technical: { endpoint: 'mock://acp/agents/AGT-assessment', contract: { inputs: ['Claim record', 'Evidence'], outputs: ['Damage estimate'] }, lastValidated: '2026-10-30', certifiedDomains: ['Insurance'] },
  },
  {
    id: 'AGT-classifier', name: 'Document Classifier', kind: 'agent', owner: 'Agent Control Plane', version: '3.0.2',
    capabilityIds: ['request-intake', 'application-intake'], domains: 'all', availability: 'available',
    note: 'Classifies incoming requests and attachments; certified for all three domains.',
    purpose: 'Recognises what an incoming request or attachment is and routes it to the right process.',
    responsibilities: ['Identify the request type', 'Classify each attachment', 'Detect incomplete submissions'],
    dependencies: [],
    technical: { endpoint: 'mock://acp/agents/AGT-classifier', contract: { inputs: ['Incoming submission'], outputs: ['Request type', 'Attachment types'] }, lastValidated: '2026-11-01', certifiedDomains: ['Insurance', 'Healthcare', 'Banking'] },
  },
  {
    id: 'AGT-summariser', name: 'Case Summariser', kind: 'agent', owner: 'Agent Control Plane', version: '1.2.0',
    capabilityIds: ['case-summary'], domains: ['insurance', 'banking', 'healthcare'], availability: 'available',
    note: 'Summarises case history for reviewers.',
    purpose: 'Writes a short, sourced summary of a case so a reviewer can decide quickly.',
    responsibilities: ['Summarise documents and history', 'Link each statement to its source'],
    dependencies: [],
    technical: { endpoint: 'mock://acp/agents/AGT-summariser', contract: { inputs: ['Case documents'], outputs: ['Case summary'] }, lastValidated: '2026-10-22', certifiedDomains: ['Insurance', 'Banking'] },
  },
  {
    id: 'AGT-kyc', name: 'KYC Checker', kind: 'agent', owner: 'Agent Control Plane', version: '0.7.0',
    capabilityIds: ['kyc-check'], domains: ['banking'], availability: 'restricted',
    note: 'Restricted: use requires a compliance approval in the Agent Control Plane.',
    purpose: 'Verifies the identity of a business and its owners against sanctions and registry data.',
    responsibilities: ['Verify company registration', 'Screen owners against sanctions lists', 'Record verification evidence'],
    dependencies: ['Core banking connector'],
    configuration: 'A compliance officer must approve this application’s use of the KYC Checker in the Agent Control Plane.',
    technical: { endpoint: 'mock://acp/agents/AGT-kyc', contract: { inputs: ['Business details', 'Owner details'], outputs: ['Verification result'] }, lastValidated: '2026-09-14', certifiedDomains: ['Banking'] },
  },

  // ── AI Workers (AI Workers Platform) ─────────────────────────────────
  {
    id: 'WRK-doc-extract', name: 'Document Extraction Worker', kind: 'worker', owner: 'AI Workers Platform', version: '1.4.0',
    capabilityIds: ['document-extraction'], domains: 'all', availability: 'available',
    note: 'Extracts structured fields from PDFs, photos and spreadsheets.',
    purpose: 'Reads documents and photos and pulls out the details a process needs, with a confidence level per field.',
    responsibilities: ['Extract fields from estimates, invoices, statements and clinical notes', 'Send low-confidence fields for human review'],
    dependencies: ['Document Classifier'],
    runtime: { state: 'busy', currentTask: 'Extracting DOC-7810', appId: 'document-ai' },
    technical: { endpoint: 'mock://awp/workers/WRK-doc-extract', contract: { inputs: ['Document'], outputs: ['Extracted fields'] }, lastValidated: '2026-11-02' },
  },
  {
    id: 'WRK-coverage', name: 'Coverage Analyst Worker', kind: 'worker', owner: 'AI Workers Platform', version: '2.0.1',
    capabilityIds: ['coverage-validation'], domains: ['insurance'], availability: 'available',
    note: 'Checks the claim against policy cover and explains the result.',
    purpose: 'Checks a claim against the policy’s cover, exclusions and excess, and explains the result in plain language.',
    responsibilities: ['Confirm the peril is covered', 'Apply excess and limits', 'Explain the coverage decision'],
    dependencies: ['Policy administration connector', 'Insurance domain pack'],
    runtime: { state: 'busy', currentTask: 'Validating CLM-24-1060', appId: 'claims-intelligence' },
    technical: { endpoint: 'mock://awp/workers/WRK-coverage', contract: { inputs: ['Claim record', 'Policy'], outputs: ['Coverage result'] }, lastValidated: '2026-10-31' },
  },
  {
    id: 'WRK-fraud-signals', name: 'Fraud Signals Worker', kind: 'worker', owner: 'AI Workers Platform', version: '0.9.2',
    capabilityIds: ['fraud-assessment'], domains: ['insurance'], availability: 'available',
    note: 'Flags fraud indicators. Does not assemble investigation case files.',
    purpose: 'Screens each claim for known fraud indicators and explains which ones it found.',
    responsibilities: ['Check claims against fraud indicators', 'Explain each indicator found', 'Route flagged claims for review'],
    dependencies: ['Insurance domain pack'],
    runtime: { state: 'busy', currentTask: 'Screening CLM-24-1058', appId: 'claims-intelligence' },
    technical: { endpoint: 'mock://awp/workers/WRK-fraud-signals', contract: { inputs: ['Claim record'], outputs: ['Fraud indicators'] }, lastValidated: '2026-10-29' },
  },
  {
    id: 'WRK-settlement', name: 'Claims Correspondence Worker', kind: 'worker', owner: 'AI Workers Platform', version: '1.1.0',
    capabilityIds: ['correspondence'], domains: ['insurance'], availability: 'available',
    note: 'Drafts settlement, decline and information-request letters.',
    purpose: 'Drafts the letters a claim needs — settlement, decline, or a request for more information — for a person to send.',
    responsibilities: ['Draft settlement and decline letters', 'Draft requests for missing information', 'Use approved templates and wording'],
    dependencies: ['Insurance domain pack'],
    runtime: { state: 'idle' },
    technical: { endpoint: 'mock://awp/workers/WRK-settlement', contract: { inputs: ['Claim decision'], outputs: ['Draft letter'] }, lastValidated: '2026-10-25' },
  },
  {
    id: 'WRK-triage', name: 'Inbox Triage Worker', kind: 'worker', owner: 'AI Workers Platform', version: '0.6.3',
    capabilityIds: ['task-allocation'], domains: 'all', availability: 'available',
    note: 'Reused with a claims allocation configuration rather than creating a new worker.',
    purpose: 'Allocates incoming work to the right team and person based on type, skills and workload.',
    responsibilities: ['Allocate work to queues', 'Balance workload across a team', 'Escalate work that is close to its deadline'],
    dependencies: [],
    configuration: 'Needs a claims allocation configuration (queues, skills and deadlines) agreed with the claims operations lead.',
    runtime: { state: 'idle' },
    technical: { endpoint: 'mock://awp/workers/WRK-triage', contract: { inputs: ['Work item'], outputs: ['Allocation'] }, lastValidated: '2026-10-12' },
  },
  {
    id: 'WRK-investigation', name: 'Claims Investigation Worker', kind: 'worker', owner: 'AI Workers Platform', version: '0.1.0',
    capabilityIds: ['claims-investigation-legacy'], domains: ['insurance'], availability: 'validating',
    note: 'Still in validation on the AI Workers Platform; not yet usable.',
    purpose: 'An earlier investigation worker composed by another team. Still being validated.',
    responsibilities: ['Assemble investigation case files'],
    dependencies: ['Case Summariser'],
    runtime: { state: 'validating', currentTask: 'Validation tests running' },
    technical: { endpoint: 'mock://awp/workers/WRK-investigation', contract: { inputs: ['Claim record'], outputs: ['Case file'] }, lastValidated: '—' },
  },

  // ── Services (TCS BiOS) ──────────────────────────────────────
  {
    id: 'SVC-approvals', name: 'Approval Service', kind: 'service', owner: 'TCS BiOS', version: '1.2.0',
    capabilityIds: ['human-task'], domains: 'all', availability: 'available',
    note: 'Human task inbox with approval, referral and audit trail.',
    purpose: 'Puts decisions in front of the right person, records what they decided and why.',
    responsibilities: ['Queue decisions for the assigned role', 'Record each decision with its reason', 'Enforce who may decide'],
    dependencies: [],
    technical: { endpoint: 'mock://os/services/approvals', contract: { inputs: ['Decision request'], outputs: ['Decision'] }, lastValidated: '2026-11-03' },
  },
  {
    id: 'SVC-routing', name: 'Decision Rules Service', kind: 'service', owner: 'TCS BiOS', version: '1.0.0',
    capabilityIds: ['risk-routing', 'claim-decision', 'credit-decision'], domains: 'all', availability: 'available',
    note: 'Deterministic rules decide routing and straightforward decisions.',
    purpose: 'Applies the business’s own rules to decide where a case goes next, or to decide straightforward cases.',
    responsibilities: ['Route cases by risk and value', 'Decide cases that fully meet agreed rules', 'Explain which rule applied'],
    dependencies: [],
    configuration: 'Decision thresholds (value, risk and authority limits) must be agreed by the business owner before the rules run.',
    technical: { endpoint: 'mock://os/services/rules', contract: { inputs: ['Case facts'], outputs: ['Route or decision', 'Rule applied'] }, lastValidated: '2026-11-03' },
  },
  {
    id: 'SVC-notify', name: 'Notification Service', kind: 'service', owner: 'TCS BiOS', version: '1.0.0',
    capabilityIds: ['decision-notification'], domains: 'all', availability: 'available',
    note: 'Sends status updates and decisions to customers and staff.',
    purpose: 'Sends decisions and status updates to customers, providers and staff through approved channels.',
    responsibilities: ['Send decision letters', 'Send status updates', 'Record what was sent'],
    dependencies: [],
    technical: { endpoint: 'mock://os/services/notify', contract: { inputs: ['Message'], outputs: ['Delivery record'] }, lastValidated: '2026-11-01' },
  },
  {
    id: 'SVC-observability', name: 'Outcome Monitoring', kind: 'service', owner: 'TCS BiOS', version: '0.3.0',
    capabilityIds: ['outcome-monitoring'], domains: 'all', availability: 'available',
    note: 'Tracks workflow outcomes and human interventions per application.',
    purpose: 'Shows how cases are flowing, where people step in and where work gets stuck.',
    responsibilities: ['Track outcomes per workflow step', 'Highlight bottlenecks and interventions'],
    dependencies: [],
    technical: { endpoint: 'mock://os/services/observability', contract: { inputs: ['Workflow events'], outputs: ['Outcome views'] }, lastValidated: '2026-10-20' },
  },

  // ── Connectors (integration infrastructure) ──────────────────────────
  {
    id: 'CON-policy', name: 'Policy administration connector', kind: 'connector', owner: 'Integration infrastructure', version: '2.3.0',
    capabilityIds: ['claims-system-access'], domains: ['insurance'], availability: 'available',
    note: 'Reads policies and writes claim status to PolicyCore.',
    purpose: 'Gives the application read access to policies and lets it update claim status in the policy system.',
    responsibilities: ['Read policy and cover details', 'Write claim status back to the policy system'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/policycore', contract: { inputs: ['Policy number'], outputs: ['Policy and cover'] }, lastValidated: '2026-11-02', protocol: 'REST API', system: 'PolicyCore' },
  },
  {
    id: 'CON-payments', name: 'Claims payments connector', kind: 'connector', owner: 'Integration infrastructure', version: '1.6.0',
    capabilityIds: ['payments-access'], domains: ['insurance'], availability: 'available',
    note: 'Issues approved payments through PayHub.',
    purpose: 'Issues approved claim payments through the payments system.',
    responsibilities: ['Issue approved payments', 'Confirm payment status'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/payhub', contract: { inputs: ['Approved payment'], outputs: ['Payment confirmation'] }, lastValidated: '2026-10-27', protocol: 'REST API', system: 'PayHub' },
  },
  {
    id: 'CON-dms', name: 'Document repository connector', kind: 'connector', owner: 'Integration infrastructure', version: '1.2.0',
    capabilityIds: ['document-storage'], domains: 'all', availability: 'available',
    note: 'Stores and retrieves case documents.',
    purpose: 'Stores case documents and retrieves them for review.',
    responsibilities: ['Store documents with retention rules', 'Retrieve documents for a case'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/records-dms', contract: { inputs: ['Document'], outputs: ['Document reference'] }, lastValidated: '2026-10-30', protocol: 'MCP server', system: 'Records DMS' },
  },
  {
    id: 'CON-provider', name: 'Provider records connector', kind: 'connector', owner: 'Integration infrastructure', version: '1.1.0',
    capabilityIds: ['eligibility-check', 'provider-records-access'], domains: ['healthcare'], availability: 'available',
    note: 'Receives provider records and checks member eligibility.',
    purpose: 'Receives records from providers and checks whether a member is covered for a service.',
    responsibilities: ['Receive provider submissions', 'Check member eligibility and benefits'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/provider-sftp', contract: { inputs: ['Member id', 'Service'], outputs: ['Eligibility result'] }, lastValidated: '2026-11-04', protocol: 'SFTP', system: 'Provider SFTP' },
  },
  {
    id: 'CON-events', name: 'Claim events connector', kind: 'connector', owner: 'Integration infrastructure', version: '1.0.0',
    capabilityIds: ['claim-events'], domains: ['insurance'], availability: 'available',
    note: 'Publishes claim status events to the enterprise event bus.',
    purpose: 'Publishes claim status changes so other systems stay up to date.',
    responsibilities: ['Publish claim status events'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/event-bus', contract: { inputs: ['Status change'], outputs: ['Event'] }, lastValidated: '2026-10-18', protocol: 'Event stream', system: 'Enterprise event bus' },
  },
  {
    id: 'CON-core-banking', name: 'Core banking connector', kind: 'connector', owner: 'Integration infrastructure', version: '3.0.0',
    capabilityIds: ['banking-system-access'], domains: ['banking'], availability: 'available',
    note: 'Reads customer accounts and books approved facilities.',
    purpose: 'Reads business customers’ accounts and books approved facilities in the core banking system.',
    responsibilities: ['Read account history', 'Book approved facilities'],
    dependencies: [],
    technical: { endpoint: 'mock://integration/core-banking', contract: { inputs: ['Customer id'], outputs: ['Accounts', 'Facility booking'] }, lastValidated: '2026-11-01', protocol: 'REST API', system: 'Core banking' },
  },

  // ── Domain knowledge (Domain Intelligence Kernel) ────────────────────
  {
    id: 'DP-insurance', name: 'Insurance domain pack', kind: 'knowledge', owner: 'Domain Intelligence Kernel', version: '0.1.0-draft',
    capabilityIds: ['insurance-knowledge'], domains: ['insurance'], availability: 'available',
    note: 'Draft ontology, claims process library and coverage rules.',
    purpose: 'Shared insurance knowledge: what a claim, policy and coverage are, standard claims processes and rules.',
    responsibilities: ['Claims ontology', 'Claims process library', 'Coverage and fraud indicator rules'],
    dependencies: [],
    technical: { endpoint: 'mock://kernel/packs/insurance', contract: { inputs: [], outputs: ['Ontology', 'Processes', 'Rules'] }, lastValidated: '2026-10-15' },
  },
  {
    id: 'DP-healthcare', name: 'Healthcare domain pack', kind: 'knowledge', owner: 'Domain Intelligence Kernel', version: '—',
    capabilityIds: ['healthcare-knowledge'], domains: ['healthcare'], availability: 'planned',
    note: 'Planned — not yet built. Clinical terminology will be limited.',
    purpose: 'Planned shared healthcare knowledge: clinical terminology, authorization processes and criteria.',
    responsibilities: ['Clinical terminology (planned)', 'Prior authorization process library (planned)'],
    dependencies: [],
    configuration: 'Until the pack exists, the organisation must supply its own clinical criteria documents.',
    technical: { endpoint: 'mock://kernel/packs/healthcare', contract: { inputs: [], outputs: [] }, lastValidated: '—' },
  },
  {
    id: 'DP-banking', name: 'Banking domain pack', kind: 'knowledge', owner: 'Domain Intelligence Kernel', version: '—',
    capabilityIds: ['banking-knowledge'], domains: ['banking'], availability: 'planned',
    note: 'Planned — not yet built. Lending rules must come from the bank.',
    purpose: 'Planned shared banking knowledge: lending products, credit policy and regulatory rules.',
    responsibilities: ['Lending ontology (planned)', 'Credit policy library (planned)'],
    dependencies: [],
    configuration: 'Until the pack exists, the bank must supply its own lending policy.',
    technical: { endpoint: 'mock://kernel/packs/banking', contract: { inputs: [], outputs: [] }, lastValidated: '—' },
  },
]

export const resourceKindLabel: Record<ResourceKind, string> = {
  worker: 'AI Worker',
  agent: 'Agent',
  connector: 'Connector',
  service: 'Service',
  knowledge: 'Domain knowledge',
}

export const availabilityLabel: Record<ResourceAvailability, string> = {
  available: 'Available',
  restricted: 'Restricted',
  validating: 'In validation',
  planned: 'Planned',
}

// ── Worker compositions proposed for missing capabilities ───────────────

export interface WorkerProposal {
  capabilityId: string
  name: string
  purpose: string
  whyNeeded: string
  responsibilities: string[]
  /** Existing agents the worker would be allowed to call. */
  agentAccess: string[]
  knowledge: string[]
  /** Existing resources checked first, and why they don't fit. */
  reuseChecked: { resource: string; reason: string }[]
  /** What happens to the workflow if the user rejects the composition. */
  ifRejected: string
  /**
   * Deterministic simulated failure on the first attempt (demonstrates the error path).
   * The retry action describes what the user changes before trying again.
   */
  firstAttemptFailure?: { atStep: number; message: string; retryLabel: string }
}

export const workerProposals: WorkerProposal[] = [
  {
    capabilityId: 'fraud-investigation',
    name: 'Fraud Investigation Worker',
    purpose: 'Assembles an investigation case file for flagged claims: gathers evidence, links prior claims and drafts questions for the investigator.',
    whyNeeded: 'The selected approach investigates flagged claims before a person reviews them. Without it, every flagged claim waits for an investigator to start from scratch.',
    responsibilities: ['Collect the evidence for a flagged claim', 'Link related claims and parties', 'Summarise fraud indicators with sources', 'Draft questions for the investigator'],
    agentAccess: ['Case Summariser 1.2.0', 'Document Classifier 3.0.2'],
    knowledge: ['Insurance domain pack 0.1.0-draft — fraud indicators'],
    reuseChecked: [
      { resource: 'Fraud Signals Worker 0.9.2', reason: 'Flags indicators but cannot gather evidence or build a case file.' },
      { resource: 'Claims Investigation Worker 0.1.0', reason: 'Still in validation on the AI Workers Platform; not yet usable.' },
    ],
    ifRejected: 'Flagged claims would go straight to a fraud investigator with no prepared case file. “Assisted Claims Processing” works this way and needs no new worker.',
  },
  {
    capabilityId: 'clinical-criteria-review',
    name: 'Medical Necessity Review Worker',
    purpose: 'Compares a prior-authorization request with the payer’s medical necessity criteria and lists what is met, unmet or missing.',
    whyNeeded: 'Reviewers need the criteria check prepared before they decide. No existing worker reads medical necessity criteria.',
    responsibilities: ['Match the request to the applicable criteria', 'List missing clinical evidence', 'Draft a summary for the clinical reviewer'],
    agentAccess: ['Document Classifier 3.0.2', 'Case Summariser 1.2.0'],
    knowledge: ['Payer medical necessity criteria (supplied by the organisation)'],
    reuseChecked: [{ resource: 'Document Extraction Worker 1.4.0', reason: 'Reads documents but does not evaluate criteria.' }],
    ifRejected: 'Clinical reviewers would check criteria by hand for every request, as in “Assisted Review”.',
    firstAttemptFailure: {
      atStep: 3,
      message: '2 of 6 validation cases failed: no medical necessity criteria document is attached, so the worker could not be tested against real criteria.',
      retryLabel: 'Attach sample criteria and retry',
    },
  },
  {
    capabilityId: 'cash-flow-analysis',
    name: 'Credit Risk Analysis Worker',
    purpose: 'Reads bank statements and management accounts and summarises the applicant’s cash-flow and affordability for the credit officer.',
    whyNeeded: 'Credit officers currently rebuild cash-flow summaries by hand for every application.',
    responsibilities: ['Categorise transactions', 'Summarise monthly cash flow', 'Highlight irregular patterns', 'Draft an affordability summary'],
    agentAccess: ['Document Classifier 3.0.2', 'Case Summariser 1.2.0'],
    knowledge: ['Bank lending policy (supplied by the organisation)'],
    reuseChecked: [{ resource: 'Document Extraction Worker 1.4.0', reason: 'Extracts statement lines but does not analyse them.' }],
    ifRejected: 'Credit officers would assess risk from raw statements, as in “Assisted Underwriting”.',
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
