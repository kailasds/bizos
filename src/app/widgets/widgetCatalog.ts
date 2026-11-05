import type { WidgetId } from '@/app/os/os-context'

/** Display order and settings copy for desktop widgets. */
export const widgetOrder: { id: WidgetId; name: string; description: string }[] = [
  { id: 'platform-health', name: 'Platform health', description: 'Status of the runtime and connected platforms.' },
  { id: 'pending-approvals', name: 'Approvals', description: 'Decisions waiting on you, and Studio items that need attention.' },
  { id: 'active-applications', name: 'Application activity', description: 'Open, recently published and changed applications.' },
  { id: 'worker-activity', name: 'Worker activity', description: 'AI workers involved in application workflows.' },
  { id: 'recent-activity', name: 'Platform activity', description: 'Publications, blueprint changes, validations and compositions.' },
  { id: 'active-executions', name: 'Simulated executions', description: 'Workflow runs in progress (simulated).' },
]
