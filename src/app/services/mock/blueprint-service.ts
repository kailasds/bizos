/**
 * Blueprint helpers used by the Studio and the registry: version comparison, readiness
 * and per-section status. Deterministic, derived only from blueprints and the latest
 * validation run — nothing here invents findings.
 */

import type { ApplicationBlueprint } from '@/app/blueprint/types'
import type { StatusTone } from '@/components/os/StatusBadge'
import type { BlueprintSection, FindingCategory, StudioProject, ValidationFinding } from '@/app/studio/types'

export const sectionLabel: Record<BlueprintSection, string> = {
  overview: 'Application overview',
  requirements: 'Business requirements',
  solution: 'Selected solution',
  workflow: 'Workflow',
  resources: 'Resources',
  data: 'Data model',
  experience: 'Experience and screens',
  security: 'Security and governance',
  deployment: 'Deployment',
}

export type ChangeKind = 'added' | 'removed' | 'changed'

/** Every diff line starts with Added / Removed / Changed; the UI highlights by kind. */
export function changeKind(line: string): ChangeKind {
  return line.startsWith('Added') ? 'added' : line.startsWith('Removed') ? 'removed' : 'changed'
}

export interface SectionDiff {
  section: BlueprintSection
  changes: string[]
}

function setDiff<T>(a: T[], b: T[], key: (t: T) => string, name: (t: T) => string, noun: string): string[] {
  const ak = new Map(a.map((t) => [key(t), t]))
  const bk = new Map(b.map((t) => [key(t), t]))
  return [
    ...b.filter((t) => !ak.has(key(t))).map((t) => `Added ${noun} “${name(t)}”`),
    ...a.filter((t) => !bk.has(key(t))).map((t) => `Removed ${noun} “${name(t)}”`),
  ]
}

/** What changed from `a` (older) to `b` (newer), grouped by blueprint section. */
export function diffBlueprints(a: ApplicationBlueprint, b: ApplicationBlueprint): SectionDiff[] {
  const out: SectionDiff[] = []
  const push = (section: BlueprintSection, changes: string[]) => changes.length && out.push({ section, changes })

  push('overview', [
    ...(a.name !== b.name ? [`Changed name: “${a.name}” → “${b.name}”`] : []),
    ...(a.description !== b.description ? ['Changed description'] : []),
  ])
  push('requirements', [
    ...setDiff(a.requirements.capabilities, b.requirements.capabilities, (c) => c.id, (c) => c.label, 'capability'),
    ...setDiff(a.requirements.users, b.requirements.users, (c) => c.id, (c) => c.label, 'user group'),
    ...setDiff(a.requirements.constraints, b.requirements.constraints, (c) => c.id, (c) => c.label, 'constraint'),
    ...setDiff(a.requirements.outputs, b.requirements.outputs, (c) => c.id, (c) => c.label, 'output'),
    ...(a.requirements.objective !== b.requirements.objective ? ['Changed business objective'] : []),
  ])
  push('solution', a.solutionArchitecture.optionId !== b.solutionArchitecture.optionId ? [`Changed approach: “${a.solutionArchitecture.name}” → “${b.solutionArchitecture.name}”`] : [])
  const roleName = (bp: ApplicationBlueprint, id: string | null) => (id ? (bp.security.roles.find((r) => r.id === id)?.name ?? id) : 'nobody')
  push('workflow', [
    ...setDiff(a.workflow.nodes, b.workflow.nodes, (n) => n.id, (n) => n.name, 'step'),
    ...b.workflow.nodes
      .filter((n) => {
        const before = a.workflow.nodes.find((x) => x.id === n.id)
        return before && before.role !== n.role
      })
      .map((n) => `Changed “${n.name}”: now decided by ${roleName(b, n.role)} (was ${roleName(a, a.workflow.nodes.find((x) => x.id === n.id)!.role)})`),
    ...b.workflow.nodes
      .filter((n) => {
        const before = a.workflow.nodes.find((x) => x.id === n.id)
        return before && (before.name !== n.name || before.actor !== n.actor)
      })
      .map((n) => {
        const before = a.workflow.nodes.find((x) => x.id === n.id)!
        return before.name !== n.name ? `Changed step “${before.name}”: renamed to “${n.name}”` : `Changed step “${n.name}”: ${before.actor} → ${n.actor}`
      }),
  ])
  const ra = Object.values(a.resources).flat()
  const rb = Object.values(b.resources).flat()
  push('resources', [
    ...setDiff(ra, rb, (r) => r.id, (r) => `${r.name} ${r.version}`, 'resource'),
    ...rb.filter((r) => ra.some((x) => x.id === r.id && x.version !== r.version)).map((r) => `Changed resource “${r.name}”: pinned at ${r.version}`),
  ])
  push(
    'data',
    b.dataModel.entities.flatMap((e) => {
      const before = a.dataModel.entities.find((x) => x.id === e.id)
      const changed = e.fields.flatMap((f) => {
        const prev = before?.fields.find((x) => x.id === f.id)
        if (!prev) return []
        return [
          ...(prev.label !== f.label ? [`Changed ${e.name} field “${prev.label}”: renamed to “${f.label}”`] : []),
          ...(prev.type !== f.type ? [`Changed ${e.name} field “${f.label}”: type ${prev.type} → ${f.type}`] : []),
          ...((prev.options?.length ?? 0) !== (f.options?.length ?? 0) ? [`Changed ${e.name} field “${f.label}”: ${prev.options?.length ?? 0} → ${f.options?.length ?? 0} options`] : []),
        ]
      })
      return [...setDiff(before?.fields ?? [], e.fields, (f) => f.id, (f) => f.label, `${e.name} field`), ...changed]
    }),
  )
  push('experience', [
    ...setDiff(a.experience.pages, b.experience.pages, (p) => p.id, (p) => p.title, 'screen'),
    ...b.experience.pages
      .filter((p) => {
        const before = a.experience.pages.find((x) => x.id === p.id)
        return before && before.title !== p.title
      })
      .map((p) => `Changed screen “${a.experience.pages.find((x) => x.id === p.id)!.title}”: renamed to “${p.title}”`),
  ])
  push('security', setDiff(a.security.roles, b.security.roles, (r) => r.id, (r) => r.name, 'role'))
  push('deployment', a.deployment.folder !== b.deployment.folder ? [`Changed folder: ${a.deployment.folder} → ${b.deployment.folder}`] : [])
  return out
}

// ── Readiness ───────────────────────────────────────────────────────────

export type Readiness = 'not-validated' | 'outdated' | 'blocked' | 'needs-attention' | 'accepted' | 'ready'

export const readinessMeta: Record<Readiness, { label: string; tone: StatusTone; description: string }> = {
  'not-validated': { label: 'Not validated', tone: 'neutral', description: 'Validation has not run on this version yet.' },
  outdated: { label: 'Not validated', tone: 'neutral', description: 'The blueprint changed since the last validation run.' },
  blocked: { label: 'Blocked', tone: 'danger', description: 'At least one issue must be fixed before publishing.' },
  'needs-attention': { label: 'Needs attention', tone: 'warning', description: 'Some findings need your review: fix them or accept them as known gaps.' },
  accepted: { label: 'Accepted with known gaps', tone: 'info', description: 'Every check passed or was accepted by you as a known gap for this version.' },
  ready: { label: 'Ready', tone: 'success', description: 'Every check passed.' },
}

function worst(findings: ValidationFinding[], acknowledged: string[]): Readiness {
  if (findings.some((f) => f.status === 'blocked')) return 'blocked'
  if (findings.some((f) => f.status === 'needs-review' && !acknowledged.includes(f.id))) return 'needs-attention'
  if (findings.some((f) => f.status === 'needs-review')) return 'accepted'
  return 'ready'
}

export function readinessOf(project: StudioProject): Readiness {
  const v = project.validation
  if (!v || !project.blueprint) return 'not-validated'
  if (v.blueprintVersion !== project.blueprint.version) return 'outdated'
  return worst(v.findings, v.acknowledged)
}

const sectionCategories: Partial<Record<BlueprintSection, FindingCategory[]>> = {
  requirements: ['requirements'],
  workflow: ['workflow', 'approvals'],
  resources: ['capabilities', 'compatibility'],
  data: ['data-contract'],
  experience: ['ui-data'],
  security: ['security', 'approvals'],
}

/** Status shown beside each blueprint section. */
export function sectionStatus(section: BlueprintSection, project: StudioProject): { label: string; tone: StatusTone } {
  if (section === 'deployment') {
    if (!project.publication) return { label: 'Not published', tone: 'neutral' }
    return project.publication.version === project.blueprint?.version ? { label: `Published v${project.publication.version}`, tone: 'success' } : { label: 'Changes pending', tone: 'warning' }
  }
  if (section === 'solution') {
    return project.progress.architect === 'complete' ? { label: 'Confirmed', tone: 'success' } : { label: 'Needs review', tone: 'warning' }
  }
  const readiness = readinessOf(project)
  if (readiness === 'not-validated' || readiness === 'outdated') return { label: 'Not validated', tone: 'neutral' }
  if (section === 'overview') return { label: readinessMeta[readiness].label, tone: readinessMeta[readiness].tone }
  const cats = sectionCategories[section] ?? []
  const v = project.validation!
  const r = worst(v.findings.filter((f) => cats.includes(f.category)), v.acknowledged)
  return { label: readinessMeta[r].label, tone: readinessMeta[r].tone }
}
