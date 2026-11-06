import { BookOpen, Bot, Cpu, Plug, Server, type LucideIcon } from 'lucide-react'
import type { ResourceKind } from '@/app/blueprint/types'
import type { StatusTone } from '@/components/os/StatusBadge'
import type { MappingStatus } from '../../types'

export const kindIcon: Record<ResourceKind, LucideIcon> = { agent: Bot, worker: Cpu, connector: Plug, knowledge: BookOpen, service: Server }

export const mappingStatusMeta: Record<MappingStatus, { tone: StatusTone; label: string; color: string }> = {
  selected: { tone: 'success', label: 'Selected', color: 'var(--success)' },
  available: { tone: 'info', label: 'Available', color: 'var(--actor-ai)' },
  'requires-configuration': { tone: 'warning', label: 'Requires configuration', color: 'var(--warning)' },
  missing: { tone: 'danger', label: 'Missing', color: 'var(--danger)' },
}
