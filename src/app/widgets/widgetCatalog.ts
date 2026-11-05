import type { WidgetId } from '@/app/os/os-context'

/** Display order and settings copy for desktop widgets. */
export const widgetOrder: { id: WidgetId; name: string; description: string }[] = [
  { id: 'platform-health', name: 'Platform health', description: 'Status of the runtime and connected platforms.' },
  { id: 'pending-approvals', name: 'Pending approvals', description: 'Decisions waiting on you.' },
  { id: 'active-applications', name: 'Active applications', description: 'Windows open in this session.' },
  { id: 'active-executions', name: 'Active executions', description: 'Workflows currently running.' },
  { id: 'worker-activity', name: 'Worker activity', description: 'AI workers currently busy.' },
  { id: 'recent-activity', name: 'Recent activity', description: 'Latest deployments, approvals and failures.' },
]
