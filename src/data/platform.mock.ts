/**
 * MOCK — platform health, simulated workflow executions and workflow definitions.
 * Resources (agents, workers, connectors, domain packs) live in resources.mock.ts;
 * seed activity lives in activity.mock.ts. Every value here is fabricated.
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
