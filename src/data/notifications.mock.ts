import type { AppId, WindowParams } from '@/app/registry/types'

export type NotificationTone = 'info' | 'warning' | 'danger' | 'success'

export interface OsNotification {
  id: string
  title: string
  body: string
  at: string
  tone: NotificationTone
  source: string
  read: boolean
  /** Where "Open" takes the user. */
  target?: { appId: AppId; params?: WindowParams; label: string }
}

export const initialNotifications: OsNotification[] = [
  {
    id: 'N-104',
    title: 'Approval needed: CLM-24-1051',
    body: 'Commercial storm claim of £38,400 exceeds handler authority and awaits a decision.',
    at: '09:12',
    tone: 'warning',
    source: 'Claims Intelligence',
    read: false,
    target: { appId: 'claims-intelligence', params: { view: 'approvals', claim: 'CLM-24-1051' }, label: 'Review claim' },
  },
  {
    id: 'N-103',
    title: 'Document intake failed',
    body: 'DOC-7812 is password-protected and could not be classified.',
    at: '09:05',
    tone: 'danger',
    source: 'Document AI',
    read: false,
    target: { appId: 'document-ai', params: { doc: 'DOC-7812' }, label: 'Open document' },
  },
  {
    id: 'N-102',
    title: 'Worker in validation',
    body: 'Claims Investigation Worker v0.1.0 is running validation tests before it can be used.',
    at: '08:47',
    tone: 'info',
    source: 'AI Workers Platform',
    read: false,
    target: { appId: 'system-explorer', params: { section: 'workers' }, label: 'View workers' },
  },
  {
    id: 'N-101',
    title: 'Claims Intelligence 0.4.0 published',
    body: 'Adds the approvals queue and pins Assessment Agent v2.1.0.',
    at: 'Yesterday',
    tone: 'success',
    source: 'Deployment',
    read: true,
    target: { appId: 'claims-intelligence', label: 'Open application' },
  },
]
