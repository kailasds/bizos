/**
 * MOCK — seed platform activity (simulated). Studio events (generation, validation,
 * composition, publication, rollback) are added to this feed at runtime from the
 * user's own drafts; see services/mock/activity-service.ts.
 */

import type { AppId } from '@/app/registry/types'

export type ActivityCategory =
  | 'deployment'
  | 'approval'
  | 'execution'
  | 'resource'
  | 'configuration'
  | 'validation'
  | 'blueprint'
  | 'composition'

export interface ActivityEvent {
  id: string
  /** ISO timestamp. */
  at: string
  actor: string
  summary: string
  category: ActivityCategory
  appId?: AppId
  /** Seed events are simulated; events from Studio drafts are the user's own actions. */
  simulated: boolean
}

export const seedActivity: ActivityEvent[] = [
  { id: 'ACT-9', at: '2026-11-05T09:05:00Z', actor: 'Document intake', summary: 'Execution EX-50198 failed at classification (password-protected file).', category: 'execution', appId: 'document-ai', simulated: true },
  { id: 'ACT-8', at: '2026-11-05T08:47:00Z', actor: 'AI Workers Platform', summary: 'Claims Investigation Worker 0.1.0 entered validation.', category: 'resource', simulated: true },
  { id: 'ACT-7', at: '2026-11-05T08:30:00Z', actor: 'Priya Raman', summary: 'Approved settlement for CLM-24-1039.', category: 'approval', appId: 'claims-intelligence', simulated: true },
  { id: 'ACT-6', at: '2026-11-04T16:20:00Z', actor: 'Platform Team', summary: 'Published Claims Intelligence 0.4.0.', category: 'deployment', appId: 'claims-intelligence', simulated: true },
  { id: 'ACT-5', at: '2026-11-04T15:55:00Z', actor: 'Platform Team', summary: 'Pinned Assessment Agent to 2.1.0 for Claims Intelligence.', category: 'configuration', appId: 'claims-intelligence', simulated: true },
  { id: 'ACT-4', at: '2026-11-03T12:00:00Z', actor: 'Business Insights', summary: 'Published Analytics Workspace 0.1.0 as a preview.', category: 'deployment', appId: 'analytics-workspace', simulated: true },
  { id: 'ACT-3', at: '2026-11-02T09:30:00Z', actor: 'Shared Services', summary: 'Published Document AI 0.3.1.', category: 'deployment', appId: 'document-ai', simulated: true },
]
