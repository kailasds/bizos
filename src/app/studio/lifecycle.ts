import type { StatusTone } from '@/components/os/StatusBadge'
import { readinessOf } from '@/app/services/mock/blueprint-service'
import { stageMeta } from './stageMeta'
import { STAGES, type Lifecycle, type StageId, type StudioProject } from './types'

export const LIFECYCLE: Lifecycle[] = ['draft', 'designing', 'validating', 'ready', 'published', 'changes-pending']

export const lifecycleMeta: Record<Lifecycle, { label: string; tone: StatusTone; description: string }> = {
  draft: { label: 'Draft', tone: 'neutral', description: 'The business problem is described but not yet confirmed.' },
  designing: { label: 'Designing', tone: 'info', description: 'Requirements, approach and resources are being decided.' },
  validating: { label: 'Validating', tone: 'info', description: 'The blueprint is generated and must pass validation.' },
  ready: { label: 'Ready', tone: 'success', description: 'Validation passed. The application can be published.' },
  published: { label: 'Published', tone: 'success', description: 'Registered on the desktop. The draft matches the published version.' },
  'changes-pending': { label: 'Changes pending', tone: 'warning', description: 'Published, with draft changes not yet published.' },
}

/** Derived from existing project state — no separate lifecycle field to drift. */
export function lifecycleOf(p: StudioProject): Lifecycle {
  if (p.publication) {
    return p.progress.publish === 'complete' && p.blueprint?.version === p.publication.version ? 'published' : 'changes-pending'
  }
  if (p.progress.validate === 'complete') return 'ready'
  if (p.blueprint && (p.progress.generate === 'complete' || p.validation)) return 'validating'
  if (p.progress.discover === 'complete') return 'designing'
  return 'draft'
}

export interface NextAction {
  label: string
  stage: StageId
}

const designLabel: Partial<Record<StageId, string>> = {
  define: 'Confirm requirements',
  architect: 'Choose an approach',
  compose: 'Select resources',
  generate: 'Review the blueprint',
}

/** The single most useful thing to do next, in business language. */
export function nextAction(p: StudioProject): NextAction | null {
  const lifecycle = lifecycleOf(p)
  const firstOpen = (from: StageId, to: StageId) =>
    STAGES.slice(STAGES.indexOf(from), STAGES.indexOf(to) + 1).find((s) => p.progress[s] !== 'complete')

  if (lifecycle === 'draft') {
    return p.discover.understanding ? { label: 'Confirm what the OS understood', stage: 'discover' } : { label: 'Describe the business problem', stage: 'discover' }
  }
  if (lifecycle === 'designing') {
    const stage = firstOpen('define', 'generate') ?? 'validate'
    if (stage === 'compose' && p.composition?.mappings.some((m) => m.status === 'missing')) return { label: 'Resolve the missing capability', stage }
    return { label: designLabel[stage] ?? `Continue in ${stageMeta[stage].label}`, stage }
  }
  if (lifecycle === 'validating') {
    const readiness = readinessOf(p)
    const blocked = p.validation?.findings.filter((f) => f.status === 'blocked').length ?? 0
    if (readiness === 'blocked') return { label: `Resolve ${blocked} blocking issue${blocked === 1 ? '' : 's'}`, stage: 'validate' }
    if (readiness === 'needs-attention') return { label: 'Review readiness items', stage: 'validate' }
    return { label: 'Preview the application', stage: 'validate' }
  }
  if (lifecycle === 'ready') return { label: `Publish v${p.blueprint?.version}`, stage: 'publish' }
  if (lifecycle === 'changes-pending') {
    const stage = STAGES.find((s) => p.progress[s] === 'needs-review')
    if (stage && stage !== 'publish') return { label: `Review ${stageMeta[stage].label}`, stage }
    if (p.progress.validate !== 'complete') return { label: 'Validate the changes', stage: 'validate' }
    return { label: `Publish update v${p.blueprint?.version}`, stage: 'publish' }
  }
  return null
}
