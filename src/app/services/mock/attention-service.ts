/**
 * Items that need the user's attention across Studio drafts, for the Approvals widget.
 * Derived from project state; nothing is invented.
 */

import { lifecycleOf } from '@/app/studio/lifecycle'
import type { StudioProject } from '@/app/studio/types'
import { proposalFor } from './capability-analysis-service'

export interface AttentionItem {
  id: string
  projectId: string
  title: string
  detail: string
  tone: 'warning' | 'danger' | 'info'
}

export function studioAttention(projects: StudioProject[]): AttentionItem[] {
  return projects.flatMap((p): AttentionItem[] => {
    const items: AttentionItem[] = []
    const missing = p.composition?.mappings.filter((m) => m.status === 'missing' && !p.composition?.rejected.includes(m.capabilityId)) ?? []
    for (const m of missing) {
      items.push({
        id: `${p.id}-gap-${m.capabilityId}`,
        projectId: p.id,
        title: `${proposalFor(m.capabilityId)?.name ?? m.need} awaits your approval`,
        detail: `${p.name} · simulated worker composition`,
        tone: 'warning',
      })
    }
    const lifecycle = lifecycleOf(p)
    const blocked = p.validation && p.blueprint && p.validation.blueprintVersion === p.blueprint.version ? p.validation.findings.filter((f) => f.status === 'blocked').length : 0
    if (blocked) items.push({ id: `${p.id}-blocked`, projectId: p.id, title: `${p.name}: ${blocked} blocking issue${blocked === 1 ? '' : 's'}`, detail: 'Validation', tone: 'danger' })
    if (lifecycle === 'ready') items.push({ id: `${p.id}-ready`, projectId: p.id, title: `${p.name} v${p.blueprint?.version} is ready to publish`, detail: 'Waiting for your publish decision', tone: 'info' })
    if (lifecycle === 'changes-pending') items.push({ id: `${p.id}-pending`, projectId: p.id, title: `${p.name} has unpublished changes`, detail: `Published v${p.publication?.version} · draft v${p.blueprint?.version}`, tone: 'warning' })
    return items
  })
}
