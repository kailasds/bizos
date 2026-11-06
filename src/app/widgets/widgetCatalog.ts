import type { WidgetId } from '@/app/os/os-context'

/** Display order and settings copy for desktop widgets. */
export const widgetOrder: { id: WidgetId; name: string; description: string }[] = [
  { id: 'platform-health', name: 'Platform health', description: 'Status of the runtime and connected platforms.' },
  { id: 'pending-approvals', name: 'Approvals', description: 'Decisions waiting on you, and Studio items that need attention.' },
  { id: 'recent-activity', name: 'Platform activity', description: 'Publications, blueprint changes, validations and compositions.' },
  { id: 'active-executions', name: 'Executions', description: 'Workflow runs in progress.' },
]
