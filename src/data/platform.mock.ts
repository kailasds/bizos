/**
 * Mock platform state: health, executions, workers, agents, connectors, domain packs,
 * workflow definitions and activity. Phase 1 has no live integrations — every value
 * here is fabricated and must be presented with a mock-data marker.
 */

import type { AppId } from '@/app/registry/types'

export type HealthState = 'operational' | 'degraded' | 'outage'

export interface PlatformService {
  id: string
  name: string
  owner: string
  state: HealthState
  note: string
}

export const platformServices: PlatformService[] = [
  { id: 'runtime', name: 'Application Runtime', owner: 'Enterprise AI OS', state: 'operational', note: 'All published applications reachable.' },
  { id: 'acp', name: 'Agent Control Plane', owner: 'Agent Control Plane', state: 'operational', note: '12 agents registered.' },
  { id: 'awp', name: 'AI Workers Platform', owner: 'AI Workers Platform', state: 'degraded', note: 'Worker composition queue is slower than usual.' },
  { id: 'connectors', name: 'Enterprise connectors', owner: 'Integration infrastructure', state: 'operational', note: '5 of 5 connectors responding.' },
]

export interface Execution {
  id: string
  workflow: string
  appId: AppId
  subject: string
  step: string
  stepIndex: number
  stepCount: number
  state: 'running' | 'waiting-approval' | 'failed' | 'completed'
  startedAt: string
}

export const executions: Execution[] = [
  { id: 'EX-50211', workflow: 'Motor claim — automation first', appId: 'claims-intelligence', subject: 'CLM-24-1060', step: 'Coverage validation', stepIndex: 2, stepCount: 5, state: 'running', startedAt: '07:55' },
  { id: 'EX-50214', workflow: 'Home claim — risk first', appId: 'claims-intelligence', subject: 'CLM-24-1058', step: 'Fraud screening', stepIndex: 3, stepCount: 6, state: 'running', startedAt: '08:02' },
  { id: 'EX-50219', workflow: 'Document intake', appId: 'document-ai', subject: 'DOC-7810', step: 'Field extraction', stepIndex: 2, stepCount: 4, state: 'running', startedAt: '08:40' },
  { id: 'EX-50198', workflow: 'Document intake', appId: 'document-ai', subject: 'DOC-7812', step: 'Classification', stepIndex: 1, stepCount: 4, state: 'failed', startedAt: '09:05' },
  { id: 'EX-50176', workflow: 'Commercial claim — human assisted', appId: 'claims-intelligence', subject: 'CLM-24-1051', step: 'Settlement approval', stepIndex: 5, stepCount: 5, state: 'waiting-approval', startedAt: 'Yesterday' },
  { id: 'EX-50160', workflow: 'Motor claim — automation first', appId: 'claims-intelligence', subject: 'CLM-24-1055', step: 'Settled', stepIndex: 5, stepCount: 5, state: 'completed', startedAt: 'Yesterday' },
]

export interface Worker {
  id: string
  name: string
  version: string
  capability: string
  state: 'busy' | 'idle' | 'provisioning'
  currentTask?: string
}

export const workers: Worker[] = [
  { id: 'WRK-fraud-signals', name: 'Fraud Signals Worker', version: '0.9.2', capability: 'Score claim fraud signals', state: 'busy', currentTask: 'Screening CLM-24-1058' },
  { id: 'WRK-doc-extract', name: 'Document Extraction Worker', version: '1.4.0', capability: 'Extract structured fields from documents', state: 'busy', currentTask: 'Extracting DOC-7810' },
  { id: 'WRK-coverage', name: 'Coverage Analyst Worker', version: '2.0.1', capability: 'Explain coverage decisions', state: 'busy', currentTask: 'Validating CLM-24-1060' },
  { id: 'WRK-settlement', name: 'Settlement Drafting Worker', version: '1.1.0', capability: 'Draft settlement letters', state: 'idle' },
  { id: 'WRK-triage', name: 'Inbox Triage Worker', version: '0.6.3', capability: 'Route incoming correspondence', state: 'idle' },
  { id: 'WRK-investigation', name: 'Claims Investigation Worker', version: '0.1.0', capability: 'Assemble investigation case files', state: 'provisioning', currentTask: 'Validation tests running' },
]

export interface Agent {
  id: string
  name: string
  version: string
  capability: string
  certifiedDomains: string[]
  state: 'available' | 'restricted' | 'retired'
}

export const agents: Agent[] = [
  { id: 'AGT-intake', name: 'Intake Agent', version: '1.8.0', capability: 'Capture first notice of loss', certifiedDomains: ['Insurance'], state: 'available' },
  { id: 'AGT-assessment', name: 'Assessment Agent', version: '2.1.0', capability: 'Estimate damage from evidence', certifiedDomains: ['Insurance'], state: 'available' },
  { id: 'AGT-classifier', name: 'Document Classifier', version: '3.0.2', capability: 'Classify document type', certifiedDomains: ['Insurance', 'Healthcare', 'Banking'], state: 'available' },
  { id: 'AGT-summariser', name: 'Case Summariser', version: '1.2.0', capability: 'Summarise case history', certifiedDomains: ['Insurance', 'Banking'], state: 'available' },
  { id: 'AGT-kyc', name: 'KYC Checker', version: '0.7.0', capability: 'Verify customer identity', certifiedDomains: ['Banking'], state: 'restricted' },
]

export interface Connector {
  id: string
  name: string
  system: string
  protocol: 'REST API' | 'MCP server' | 'SFTP' | 'Event stream'
  state: 'connected' | 'disconnected'
}

export const connectors: Connector[] = [
  { id: 'CON-policy', name: 'Policy administration', system: 'PolicyCore', protocol: 'REST API', state: 'connected' },
  { id: 'CON-payments', name: 'Claims payments', system: 'PayHub', protocol: 'REST API', state: 'connected' },
  { id: 'CON-dms', name: 'Document repository', system: 'Records DMS', protocol: 'MCP server', state: 'connected' },
  { id: 'CON-provider', name: 'Provider records drop', system: 'Provider SFTP', protocol: 'SFTP', state: 'connected' },
  { id: 'CON-events', name: 'Claim events', system: 'Enterprise event bus', protocol: 'Event stream', state: 'connected' },
]

export interface DomainPack {
  id: string
  name: string
  version: string
  state: 'available' | 'planned'
  contents: string
}

export const domainPacks: DomainPack[] = [
  { id: 'DP-insurance', name: 'Insurance', version: '0.1.0-draft', state: 'planned', contents: 'Ontology, claims process library, coverage rules' },
  { id: 'DP-healthcare', name: 'Healthcare', version: '—', state: 'planned', contents: 'Not started' },
  { id: 'DP-banking', name: 'Banking', version: '—', state: 'planned', contents: 'Not started' },
]

export interface WorkflowDefinition {
  id: string
  name: string
  appId: AppId
  version: string
  approach: string
  steps: { name: string; kind: 'agent' | 'worker' | 'rule' | 'human' | 'connector'; resource: string }[]
}

export const workflowDefinitions: WorkflowDefinition[] = [
  {
    id: 'WF-motor-auto',
    name: 'Motor claim — automation first',
    appId: 'claims-intelligence',
    version: '1.3.0',
    approach: 'Automate intake and validation; human approval for settlement above £500.',
    steps: [
      { name: 'Capture FNOL', kind: 'agent', resource: 'Intake Agent v1.8' },
      { name: 'Validate coverage', kind: 'rule', resource: 'Coverage Rules Engine v3.2' },
      { name: 'Screen fraud signals', kind: 'worker', resource: 'Fraud Signals Worker v0.9' },
      { name: 'Assess damage', kind: 'agent', resource: 'Assessment Agent v2.1' },
      { name: 'Approve settlement', kind: 'human', resource: 'Claims handler' },
      { name: 'Issue payment', kind: 'connector', resource: 'PayHub' },
    ],
  },
  {
    id: 'WF-home-risk',
    name: 'Home claim — risk first',
    appId: 'claims-intelligence',
    version: '0.8.0',
    approach: 'Screen for risk before coverage work; route high-risk claims to investigation.',
    steps: [
      { name: 'Capture FNOL', kind: 'agent', resource: 'Intake Agent v1.8' },
      { name: 'Screen fraud signals', kind: 'worker', resource: 'Fraud Signals Worker v0.9' },
      { name: 'Investigate (high risk only)', kind: 'worker', resource: 'Claims Investigation Worker v0.1' },
      { name: 'Validate coverage', kind: 'rule', resource: 'Coverage Rules Engine v3.2' },
      { name: 'Assess damage', kind: 'agent', resource: 'Assessment Agent v2.1' },
      { name: 'Approve settlement', kind: 'human', resource: 'Claims handler' },
    ],
  },
  {
    id: 'WF-doc-intake',
    name: 'Document intake',
    appId: 'document-ai',
    version: '2.0.0',
    approach: 'Classify, extract and validate; send low-confidence fields for review.',
    steps: [
      { name: 'Receive document', kind: 'connector', resource: 'Records DMS' },
      { name: 'Classify', kind: 'agent', resource: 'Document Classifier v3.0' },
      { name: 'Extract fields', kind: 'worker', resource: 'Document Extraction Worker v1.4' },
      { name: 'Review low-confidence fields', kind: 'human', resource: 'Document reviewer' },
    ],
  },
]

export interface ActivityEvent {
  id: string
  at: string
  actor: string
  summary: string
  category: 'deployment' | 'approval' | 'execution' | 'resource' | 'configuration'
}

export const activity: ActivityEvent[] = [
  { id: 'ACT-9', at: '09:05', actor: 'Document intake', summary: 'Execution EX-50198 failed at classification (password-protected file).', category: 'execution' },
  { id: 'ACT-8', at: '08:47', actor: 'AI Workers Platform', summary: 'Claims Investigation Worker v0.1.0 entered validation.', category: 'resource' },
  { id: 'ACT-7', at: '08:30', actor: 'Priya Raman', summary: 'Approved settlement for CLM-24-1039.', category: 'approval' },
  { id: 'ACT-6', at: 'Yesterday', actor: 'Platform Team', summary: 'Published Claims Intelligence 0.4.0.', category: 'deployment' },
  { id: 'ACT-5', at: 'Yesterday', actor: 'Platform Team', summary: 'Pinned Assessment Agent to v2.1.0 for Claims Intelligence.', category: 'configuration' },
  { id: 'ACT-4', at: '03 Nov', actor: 'Business Insights', summary: 'Published Analytics Workspace 0.1.0 as a preview.', category: 'deployment' },
]
