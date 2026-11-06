/**
 * MOCK — the visible chain of reasoning. Every link is a fact read from project state (counts,
 * names, versions). Nothing here claims a model reasoned; nothing is invented or scored.
 */

import type { StageId, StudioProject } from '@/app/studio/types'
import { readinessMeta, readinessOf } from './blueprint-service'

export type ThoughtIcon =
  | 'words'
  | 'domain'
  | 'themes'
  | 'capabilities'
  | 'people'
  | 'rules'
  | 'spec'
  | 'approaches'
  | 'approach'
  | 'steps'
  | 'needs'
  | 'found'
  | 'gap'
  | 'blueprint'
  | 'screens'
  | 'checks'
  | 'issues'
  | 'desktop'

export interface ThoughtLink {
  icon: ThoughtIcon
  value: string
  label: string
  tone?: 'warning' | 'danger' | 'success'
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** How this stage was reached, as a short chain of facts. */
export function thoughtChain(project: StudioProject | null, stage: StageId): ThoughtLink[] {
  if (!project) return []
  const u = project.discover.understanding
  const spec = project.requirements
  const arch = project.architecture
  const option = arch?.options.find((o) => o.id === arch.selectedOptionId)
  const mappings = project.composition?.mappings ?? []
  const bp = project.blueprint

  switch (stage) {
    case 'discover': {
      if (!u) return []
      const capabilities = u.items.filter((i) => i.kind === 'capability').length
      return [
        { icon: 'words', value: String(u.matchedPhrases.length), label: `${plural(u.matchedPhrases.length, 'phrase')} of yours` },
        { icon: 'domain', value: capitalize(project.discover.domain ?? ''), label: 'domain pack' },
        { icon: 'themes', value: String(u.items.length), label: plural(u.items.length, 'signal') },
        { icon: 'capabilities', value: String(capabilities), label: plural(capabilities, 'capability', 'capabilities') },
      ]
    }
    case 'define':
      if (!spec) return []
      return [
        { icon: 'capabilities', value: String(spec.capabilities.length), label: plural(spec.capabilities.length, 'capability', 'capabilities') },
        { icon: 'people', value: String(spec.users.length), label: plural(spec.users.length, 'user group') },
        { icon: 'rules', value: String(spec.constraints.length), label: plural(spec.constraints.length, 'constraint') },
        { icon: 'spec', value: `v${spec.version}`, label: 'specification' },
      ]
    case 'architect': {
      if (!arch) return []
      const humans = option?.steps.filter((s) => s.actor === 'human').length
      const chosen: ThoughtLink[] = option
        ? [
            { icon: 'approach', value: option.name, label: 'chosen' },
            { icon: 'people', value: `${humans} of ${option.steps.length}`, label: 'steps with people' },
          ]
        : []
      return [{ icon: 'spec', value: `v${spec?.version ?? 1}`, label: 'specification' }, { icon: 'approaches', value: String(arch.options.length), label: 'approaches' }, ...chosen]
    }
    case 'compose': {
      if (!project.composition) return []
      const selected = mappings.filter((m) => m.status === 'selected').length
      const missing = mappings.filter((m) => m.status === 'missing').length
      return [
        { icon: 'approach', value: option?.name ?? '', label: 'approach' },
        { icon: 'needs', value: String(mappings.length), label: plural(mappings.length, 'need') },
        missing
          ? { icon: 'gap', value: String(missing), label: 'missing', tone: 'danger' }
          : { icon: 'found', value: `${selected} of ${mappings.length}`, label: 'connected', tone: selected === mappings.length ? 'success' : undefined },
      ]
    }
    case 'generate':
      if (!bp) return []
      return [
        { icon: 'needs', value: String(Object.values(bp.resources).flat().length), label: 'resources pinned' },
        { icon: 'steps', value: String(bp.workflow.nodes.length), label: 'workflow steps' },
        { icon: 'screens', value: String(bp.experience.pages.length), label: plural(bp.experience.pages.length, 'screen') },
        { icon: 'blueprint', value: `v${bp.version}`, label: 'blueprint' },
      ]
    case 'publish':
      if (!bp) return []
      return [
        { icon: 'blueprint', value: `v${bp.version}`, label: 'blueprint' },
        { icon: 'checks', value: readinessMeta[readinessOf(project)].label, label: 'status' },
        { icon: 'desktop', value: capitalize(bp.deployment.folder), label: 'folder' },
      ]
  }
}

/** One short fact shown beside a level in the journey navigator. */
export function stageOutcome(project: StudioProject | null, stage: StageId): string | null {
  if (!project) return null
  switch (stage) {
    case 'discover': {
      const u = project.discover.understanding
      if (!u) return null
      const n = u.items.filter((i) => i.kind === 'capability').length
      return `${n} ${plural(n, 'capability', 'capabilities')}`
    }
    case 'define':
      return project.requirements ? `Spec v${project.requirements.version}` : null
    case 'architect': {
      const a = project.architecture
      if (!a) return null
      return a.options.find((o) => o.id === a.selectedOptionId)?.name ?? `${a.options.length} approaches`
    }
    case 'compose': {
      const m = project.composition?.mappings
      if (!m) return null
      return `${m.filter((x) => x.status === 'selected').length} of ${m.length} connected`
    }
    case 'generate':
      return project.blueprint ? `Blueprint v${project.blueprint.version}` : null
    case 'publish':
      return project.publication ? `Live v${project.publication.version}` : null
  }
}
