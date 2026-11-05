/**
 * Platform activity feed: simulated seed events plus events derived from the user's own
 * Studio drafts (revisions, validation runs, decisions). Derived, not stored twice.
 */

import type { StudioProject } from '@/app/studio/types'
import { seedActivity, type ActivityCategory, type ActivityEvent } from '@/data/activity.mock'

const decisionCategory: Record<string, ActivityCategory> = {
  'worker-approved': 'composition',
  'worker-rejected': 'composition',
  'composition-failed': 'composition',
  'resources-selected': 'configuration',
  'configuration-confirmed': 'configuration',
  'gap-accepted': 'validation',
  rollback: 'blueprint',
  published: 'deployment',
}

export function studioActivity(projects: StudioProject[]): ActivityEvent[] {
  return projects.flatMap((p): ActivityEvent[] => [
    ...p.revisions
      .filter((r) => r.kind !== 'rollback')
      .map((r) => ({
        id: `${p.id}-rev-${r.version}-${r.createdAt}`,
        at: r.createdAt,
        actor: 'Application Studio',
        summary: `${p.name} blueprint ${r.version}: ${r.summary}`,
        category: 'blueprint' as const,
        simulated: false,
      })),
    ...p.validationRuns.map((v) => ({
      id: `${p.id}-val-${v.ranAt}`,
      at: v.ranAt,
      actor: 'Validation',
      summary: `${p.name} ${v.version} validated: ${v.blocked ? `${v.blocked} blocking` : 'no blocking issues'}${v.review ? `, ${v.review} to review` : ''}`,
      category: 'validation' as const,
      simulated: false,
    })),
    ...p.decisions.map((d) => ({
      id: d.id,
      at: d.at,
      actor: d.kind === 'published' ? 'Application Studio' : 'You',
      summary: `${p.name}: ${d.text}`,
      category: decisionCategory[d.kind] ?? 'configuration',
      appId: d.kind === 'published' && p.publication ? (p.publication.appId as ActivityEvent['appId']) : undefined,
      simulated: false,
    })),
  ])
}

export function platformActivity(projects: StudioProject[]): ActivityEvent[] {
  return [...studioActivity(projects), ...seedActivity].sort((a, b) => b.at.localeCompare(a.at))
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const formatActivityTime = (iso: string) => timeFormat.format(new Date(iso))
