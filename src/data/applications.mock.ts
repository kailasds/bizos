/**
 * MOCK — registry profiles for the built-in applications: the business details the
 * registry and application detail views show. Generated applications get the same
 * information from their published blueprint instead.
 */

import type { BuiltinAppId } from '@/app/registry/types'

export interface AppProfile {
  appId: BuiltinAppId
  purpose: string
  updatedAt: string
  /** Resource ids from resources.mock.ts. */
  resources: string[]
  /** Workflow definition id from platform.mock.ts. */
  workflowId?: string
  versions: { version: string; date: string; summary: string }[]
  governance: { dataClassification: string; approvals: string[]; auditLog: boolean }
}

export const appProfiles: AppProfile[] = [
  {
    appId: 'claims-intelligence',
    purpose: 'Helps claims teams triage, assess and approve insurance claims, with AI-prepared coverage and fraud checks.',
    updatedAt: '2026-11-04T16:20:00Z',
    resources: ['AGT-intake', 'WRK-doc-extract', 'WRK-coverage', 'WRK-fraud-signals', 'WRK-settlement', 'SVC-approvals', 'CON-policy', 'DP-insurance'],
    workflowId: 'WF-motor-auto',
    versions: [
      { version: '0.4.0', date: '2026-11-04T16:20:00Z', summary: 'Adds the approvals queue and pins Assessment Agent 2.1.0.' },
      { version: '0.3.0', date: '2026-10-21T10:05:00Z', summary: 'Adds fraud signal screening to the motor workflow.' },
      { version: '0.2.0', date: '2026-10-02T14:40:00Z', summary: 'First version used by the motor claims team.' },
    ],
    governance: {
      dataClassification: 'Confidential — customer and claim data',
      approvals: ['Settlements above handler authority', 'Claims with fraud indicators'],
      auditLog: true,
    },
  },
  {
    appId: 'document-ai',
    purpose: 'Classifies incoming documents and lets reviewers check extracted fields before they enter a workflow.',
    updatedAt: '2026-11-02T09:30:00Z',
    resources: ['AGT-classifier', 'WRK-doc-extract', 'CON-dms', 'CON-provider'],
    workflowId: 'WF-doc-intake',
    versions: [
      { version: '0.3.1', date: '2026-11-02T09:30:00Z', summary: 'Sends low-confidence fields for review.' },
      { version: '0.3.0', date: '2026-10-19T11:00:00Z', summary: 'Adds provider records intake.' },
    ],
    governance: {
      dataClassification: 'Confidential — may contain health and financial data',
      approvals: ['Low-confidence extracted fields'],
      auditLog: true,
    },
  },
  {
    appId: 'workflow-studio',
    purpose: 'Lets the platform team browse the workflow definitions that published applications run on.',
    updatedAt: '2026-10-30T15:00:00Z',
    resources: [],
    versions: [{ version: '0.1.0', date: '2026-10-30T15:00:00Z', summary: 'Read-only preview.' }],
    governance: { dataClassification: 'Internal', approvals: [], auditLog: false },
  },
  {
    appId: 'analytics-workspace',
    purpose: 'Reports throughput and outcomes for published applications from a fixed sample dataset.',
    updatedAt: '2026-11-03T12:00:00Z',
    resources: ['SVC-observability'],
    versions: [{ version: '0.1.0', date: '2026-11-03T12:00:00Z', summary: 'Published as a preview.' }],
    governance: { dataClassification: 'Internal — aggregated data only', approvals: [], auditLog: false },
  },
]

export const appProfileFor = (id: string) => appProfiles.find((p) => p.appId === id)
