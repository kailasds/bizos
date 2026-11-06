import { useCallback, useState, type CSSProperties } from 'react'
import { ArrowRight, PanelRightOpen, Search, SearchX } from 'lucide-react'
import type { ResourceKind } from '@/app/blueprint/types'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { coverageCounts } from '@/app/services/mock/capability-analysis-service'
import { searchCatalogue } from '@/app/services/mock/resource-discovery-service'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { availabilityLabel, resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { CoveragePanel } from '../components/compose/CoveragePanel'
import { FlowCanvas } from '../components/compose/FlowCanvas'
import { kindIcon, mappingStatusMeta } from '../components/compose/flow-meta'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { ctaClass, IconTile } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import type { CapabilityMapping } from '../types'
import { useStudio } from '../use-studio'

const kindFilters: { id: ResourceKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'worker', label: 'AI Workers' },
  { id: 'agent', label: 'Agents' },
  { id: 'connector', label: 'Connectors' },
  { id: 'service', label: 'Services' },
  { id: 'knowledge', label: 'Domain knowledge' },
]

function CatalogueBrowser({ mappings, onDetails }: { mappings: CapabilityMapping[]; onDetails: (r: PlatformResource) => void }) {
  const { project } = useStudio()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ResourceKind | 'all'>('all')
  const domain = project?.discover.domain ?? undefined
  const inDomain = searchCatalogue({ domain })
  const results = searchCatalogue({ query, kind, domain })
  const usedFor = (id: string) => mappings.find((m) => m.resource?.id === id)

  return (
    <div className="h-full overflow-y-auto pt-[calc(var(--top-offset)+5.5rem)] pr-4 pb-24 pl-[var(--rail-offset)]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-72">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or what it does" aria-label="Search resources" className="rounded-full bg-white/80 pl-9" />
        </div>
        <div role="group" aria-label="Resource type" className="flex flex-wrap gap-1">
          {kindFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={kind === f.id}
              onClick={() => setKind(f.id)}
              className={cn('flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50', kind === f.id ? 'bg-studio-ink text-white' : 'bg-white/60 text-muted-foreground hover:bg-white hover:text-foreground')}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{f.id === 'all' ? inDomain.length : inDomain.filter((r) => r.kind === f.id).length}</span>
            </button>
          ))}
        </div>
      </div>
      {results.length === 0 ? (
        <Empty className="studio-card rounded-[24px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No resources match</EmptyTitle>
            <EmptyDescription>Try another word, or show all resource types.</EmptyDescription>
          </EmptyHeader>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setQuery('')
              setKind('all')
            }}
          >
            Clear search
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-2.5 @3xl:grid-cols-2 @6xl:grid-cols-3">
          {results.map((r) => {
            const m = usedFor(r.id)
            return (
              <li key={r.id}>
                <button type="button" onClick={() => onDetails(r)} title={r.purpose} className="studio-card flex h-full w-full flex-col gap-2 rounded-[20px] p-3 text-left outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="flex items-start gap-2.5">
                    <IconTile icon={kindIcon[r.kind]} size="sm" tone={m ? 'ink' : 'soft'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-tight font-semibold">{r.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {resourceKindLabel[r.kind]} · v{r.version}
                      </span>
                    </span>
                    {r.availability !== 'available' && <StatusBadge tone="warning">{availabilityLabel[r.availability]}</StatusBadge>}
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{r.purpose}</span>
                  {m && <StatusBadge tone={mappingStatusMeta[m.status].tone}>Used for {m.need}</StatusBadge>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const compileSteps = ['Compiling the workflow', 'Deriving the data model', 'Building screens from the component catalogue', 'Assembling the blueprint']

export function ComposeStage({ onFocusOption, leftInset, topInset, canvasWidth, canvasHeight }: { onFocusOption: (id: string) => void; leftInset: number; topInset: number; canvasWidth: number; canvasHeight: number }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(600)
  const [view, setView] = useState<'flow' | 'catalogue'>('flow')
  const [detail, setDetail] = useState<PlatformResource | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composing, setComposing] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(canvasWidth >= 860)

  const mappings = project?.composition?.mappings
  const requirements = project?.requirements
  const roleLabel = useCallback((id: string) => requirements?.users.find((u) => u.id === id)?.label ?? id, [requirements])
  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setPanelOpen(true)
  }, [])

  // Guided path: when a need stops being outstanding, move straight to the next one that needs a decision.
  const [previous, setPrevious] = useState(mappings)
  if (previous !== mappings) {
    setPrevious(mappings)
    if (mappings && previous && mappings.some((m) => m.status === 'selected' && previous.find((b) => b.id === m.id)?.status !== 'selected')) {
      const next = mappings.find((m) => m.status === 'requires-configuration' || m.status === 'missing')
      setSelectedId(next?.id ?? null)
      if (next) setPanelOpen(true)
    }
  }

  if (!project?.composition || !project.discover.domain || !mappings) {
    return <StagePrerequisite stage="compose" requires="architect" message="Choose a solution approach first. Resources are discovered for it." />
  }

  const option = project.architecture?.options.find((o) => o.id === project.architecture?.selectedOptionId)
  const alternatives = project.architecture?.options.filter((o) => o.id !== option?.id) ?? []
  const counts = coverageCounts(mappings)
  const remaining = mappings.length - counts.selected
  const detailMapping = detail ? mappings.find((m) => m.resource?.id === detail.id) : undefined
  const now = () => new Date().toISOString()
  const lookAt = (id: string) => {
    onFocusOption(id)
    dispatch({ type: 'stage/go', stage: 'architect' })
  }
  const scenario = getScenario(project.scenarioId)

  const panelVisible = panelOpen && view === 'flow'
  const insets = { left: leftInset + 8, right: panelVisible && canvasWidth >= 860 ? 348 : 24, top: topInset + 104, bottom: 76 }

  return (
    <div className="h-full" style={{ '--bleed-right': panelVisible && canvasWidth >= 860 ? '340px' : '12px' } as CSSProperties}>
    <StageFrame
      stage="compose"
      bleed
      thinking={
        sim.running
          ? {
              title: 'Compiling the blueprint…',
              label: 'Generating blueprint',
              steps: compileSteps,
              current: sim.step,
              results: [option ? `${option.steps.length} steps` : undefined, scenario ? `${scenario.entity.fields.length} fields` : undefined, scenario ? `${scenario.pages.length} screens` : undefined, undefined],
            }
          : null
      }
      aside={
        <div role="group" aria-label="View" className="liquid-glass flex gap-0.5 rounded-full p-0.5">
          {(
            [
              ['flow', 'Flow'],
              ['catalogue', 'Resource catalogue'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn('h-7 rounded-full px-3 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50', view === id ? 'bg-studio-ink text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              {label}
            </button>
          ))}
          {view === 'flow' && !panelOpen && (
            <button type="button" aria-label="Show panel" onClick={() => setPanelOpen(true)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
              <PanelRightOpen className="size-4" />
            </button>
          )}
        </div>
      }
      footer={
        <>
          {remaining > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {remaining} still to connect
            </span>
          )}
          <Button className={ctaClass} disabled={remaining > 0 || sim.running} onClick={() => sim.run(compileSteps.length, () => dispatch({ type: 'compose/confirm', now: now() }))}>
            {project.blueprint ? 'Regenerate blueprint' : 'Generate blueprint'}
            <ArrowRight />
          </Button>
        </>
      }
    >
      {view === 'catalogue' ? (
        <CatalogueBrowser mappings={mappings} onDetails={setDetail} />
      ) : (
        <>
          {option && <FlowCanvas option={option} mappings={mappings} selectedId={selectedId} composing={composing} onSelect={select} roleLabel={roleLabel} inputs={requirements?.inputs.length ?? 0} outputs={requirements?.outputs.length ?? 0} insets={insets} width={canvasWidth} height={canvasHeight} />}
          {panelOpen && <CoveragePanel mappings={mappings} option={option} alternatives={alternatives} selectedId={selectedId} onSelect={select} onDetails={setDetail} onLookAt={lookAt} onBusy={setComposing} onHide={() => setPanelOpen(false)} />}
        </>
      )}
      <ResourceDetailSheet
        resource={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        context={detailMapping ? { label: 'Supports in this application', items: detailMapping.stepIds.map((id) => option?.steps.find((s) => s.id === id)?.name ?? id).concat(detailMapping.stepIds.length ? [] : [detailMapping.need]) } : undefined}
        actions={
          detailMapping?.status === 'available' ? (
            <Button onClick={() => dispatch({ type: 'compose/select', capabilityIds: [detailMapping.capabilityId], now: now() })}>Select for this application</Button>
          ) : detailMapping?.status === 'selected' && !detailMapping.created ? (
            <Button variant="outline" onClick={() => dispatch({ type: 'compose/deselect', capabilityId: detailMapping.capabilityId })}>
              Deselect
            </Button>
          ) : undefined
        }
      />
    </StageFrame>
    </div>
  )
}
