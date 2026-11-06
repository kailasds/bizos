import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, Layers, Loader2, X } from 'lucide-react'
import { validationCategories } from '@/app/blueprint/validate'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { Button } from '@/components/ui/button'
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import { STAGES, type StageId, type StudioProject } from '../types'
import { useStudio } from '../use-studio'

/** Each Studio stage builds one layer of the application, from intent up to the runtime. */
const layerName: Record<StageId, string> = {
  discover: 'Intent layer',
  define: 'Requirements layer',
  architect: 'Architecture layer',
  compose: 'Capability layer',
  generate: 'Blueprint compiler',
  validate: 'Preview & readiness',
  publish: 'Runtime',
}

type LayerState = 'inactive' | 'building' | 'complete' | 'review'

/** What each layer currently holds, derived from the project — nothing is estimated. */
function summaryOf(stage: StageId, p: StudioProject | null): string | null {
  if (!p) return null
  switch (stage) {
    case 'discover': {
      const u = p.discover.understanding
      if (!u) return null
      const caps = u.items.filter((i) => i.kind === 'capability').length
      return `${getScenario(p.scenarioId)?.label ?? 'Scenario'} · ${caps} capabilities`
    }
    case 'define':
      return p.requirements ? `Spec v${p.requirements.version} · ${p.requirements.users.length} user groups · ${p.requirements.constraints.length} constraints` : null
    case 'architect': {
      const sel = p.architecture?.options.find((o) => o.id === p.architecture?.selectedOptionId)
      return sel ? `${sel.name} · ${sel.steps.length} steps` : p.architecture ? `${p.architecture.options.length} approaches to compare` : null
    }
    case 'compose': {
      const m = p.composition?.mappings
      if (!m) return null
      const selected = m.filter((x) => x.status === 'selected').length
      const missing = m.filter((x) => x.status === 'missing').length
      return `${selected} of ${m.length} resources selected${missing ? ` · ${missing} missing` : ''}`
    }
    case 'generate': {
      const bp = p.blueprint
      return bp ? `v${bp.version} · ${bp.workflow.nodes.length} steps · ${bp.experience.pages.length} screens · ${bp.security.roles.length} roles` : null
    }
    case 'validate': {
      if (!p.validation || !p.blueprint) return null
      const passed = validationCategories.filter((c) => p.validation!.findings.filter((f) => f.category === c.id).every((f) => f.status === 'passed' || p.validation!.acknowledged.includes(f.id))).length
      return `${readinessMeta[readinessOf(p)].label} · ${passed}/${validationCategories.length} checks`
    }
    case 'publish':
      return p.publication ? `Live v${p.publication.version}${p.blueprint && p.blueprint.version !== p.publication.version ? ` · draft v${p.blueprint.version}` : ''}` : null
  }
}

export function BuildLayers({ active, onClose }: { active: StageId; onClose: () => void }) {
  const { project, dispatch } = useStudio()
  const reduce = useReducedMotion()
  const states: Record<StageId, LayerState> = Object.fromEntries(
    STAGES.map((s) => {
      const progress = project?.progress[s] ?? 'not-started'
      return [s, progress === 'complete' ? 'complete' : progress === 'needs-review' ? 'review' : s === active ? 'building' : 'inactive']
    }),
  ) as Record<StageId, LayerState>
  const done = STAGES.filter((s) => states[s] === 'complete').length

  return (
    <aside aria-label="Build layers" className="flex h-full min-h-0 w-full flex-col border-l bg-card">
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Layers className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate text-sm font-semibold">{project?.name ?? 'New application'}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {done} of {STAGES.length} layers built
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close build layers" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={done} aria-label="Build progress">
        <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(done / STAGES.length) * 100}%` }} transition={{ duration: reduce ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }} />
      </div>

      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {[...STAGES].map((stage, i) => {
          const state = states[stage]
          const Icon = stageMeta[stage].icon
          const summary = summaryOf(stage, project)
          return (
            <li key={stage}>
              <button
                type="button"
                onClick={() => project && dispatch({ type: 'stage/go', stage })}
                aria-label={`${layerName[stage]} — ${state === 'complete' ? 'built' : state === 'building' ? 'building' : state === 'review' ? 'needs review' : 'inactive'}`}
                className={cn(
                  'relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  state === 'complete' && 'border-primary/30 bg-accent/50 hover:bg-accent',
                  state === 'building' && 'border-primary bg-card shadow-[0_0_0_3px_var(--accent)]',
                  state === 'review' && 'border-warning/50 bg-warning-soft/40',
                  state === 'inactive' && 'border-dashed bg-muted/40 opacity-70 hover:opacity-100',
                )}
              >
                {state === 'building' && !reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                    animate={{ x: ['0%', '400%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                <span className="relative flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      state === 'complete' ? 'bg-primary text-primary-foreground' : state === 'building' ? 'bg-accent text-accent-foreground' : state === 'review' ? 'bg-warning-soft text-warning-ink' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">L{i + 1}</span>
                      <span className="truncate text-sm font-semibold">{layerName[stage]}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {summary ?? (state === 'building' ? 'Building…' : 'Inactive')}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0">
                    {state === 'complete' && <Check className="size-4 text-primary" strokeWidth={3} />}
                    {state === 'building' && <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" />}
                    {state === 'review' && <AlertTriangle className="size-4 text-warning-ink" />}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
