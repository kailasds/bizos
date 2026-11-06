import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronDown, CircleX, PanelRightClose, SearchX, Sparkles } from 'lucide-react'
import type { SolutionOption } from '@/app/blueprint/types'
import { composedWorker, compositionPlan, coverageCounts, proposalFor } from '@/app/services/mock/capability-analysis-service'
import { InfoTip } from '@/components/os/InfoTip'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { cn } from '@/lib/utils'
import { useSimulation } from '../../hooks/use-simulation'
import type { CapabilityMapping, MappingStatus } from '../../types'
import { useStudio } from '../../use-studio'
import { ctaClass, IconTile, ThinkingChain } from '../StudioParts'
import { kindIcon, mappingStatusMeta } from './flow-meta'

const order: MappingStatus[] = ['selected', 'available', 'requires-configuration', 'missing']
const stepNames = (option: SolutionOption | undefined, m: CapabilityMapping) => m.stepIds.map((id) => option?.steps.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n))

/** Connected vs. outstanding needs. Counts only. */
function CoverageDonut({ mappings }: { mappings: CapabilityMapping[] }) {
  const counts = coverageCounts(mappings)
  const total = Math.max(1, mappings.length)
  const r = 30
  const c = 2 * Math.PI * r
  const segments = order.reduce<{ status: MappingStatus; len: number; offset: number }[]>((acc, status) => {
    const last = acc.at(-1)
    return [...acc, { status, len: (counts[status] / total) * c, offset: last ? last.offset + last.len : 0 }]
  }, [])
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-[5.25rem] shrink-0 items-center justify-center" role="img" aria-label={`${counts.selected} of ${mappings.length} needs connected`}>
        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="oklch(0.3 0.03 235 / 0.08)" strokeWidth="9" />
          {segments.map(
            ({ status, len, offset }) =>
              len > 0 && <circle key={status} cx="40" cy="40" r={r} fill="none" stroke={mappingStatusMeta[status].color} strokeWidth="9" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} className="transition-[stroke-dasharray,stroke-dashoffset] duration-500" />,
          )}
        </svg>
        <span className="text-center leading-none">
          <span className="block text-base font-bold tabular-nums">
            {counts.selected}/{mappings.length}
          </span>
        </span>
      </span>
      <ul className="min-w-0 flex-1 space-y-1 pr-6">
        {order.map(
          (s) =>
            counts[s] > 0 && (
              <li key={s} className="flex items-center gap-1.5 text-xs">
                <span aria-hidden className="size-2 rounded-full" style={{ background: mappingStatusMeta[s].color }} />
                <span className="flex-1 truncate">{mappingStatusMeta[s].label}</span>
                <span className="font-semibold tabular-nums">{counts[s]}</span>
              </li>
            ),
        )}
      </ul>
    </div>
  )
}

function GapResolver({
  mapping,
  option,
  alternatives,
  onLookAt,
  onBusy,
}: {
  mapping: CapabilityMapping
  option: SolutionOption | undefined
  alternatives: SolutionOption[]
  onLookAt: (id: string) => void
  onBusy: (capabilityId: string | null) => void
}) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(700)
  const [failure, setFailure] = useState<{ at: number; message: string } | null>(null)
  const [showMore, setShowMore] = useState(false)
  const proposal = proposalFor(mapping.capabilityId)
  const rejected = project?.composition?.rejected.includes(mapping.capabilityId)
  const attempts = project?.composition?.attempts[mapping.capabilityId] ?? 0
  const steps = stepNames(option, mapping)
  const alternative = alternatives.find((o) => !o.steps.some((s) => s.capabilityId === mapping.capabilityId))
  const domain = project?.discover.domain ?? 'insurance'
  const now = () => new Date().toISOString()

  useEffect(() => {
    onBusy(sim.running ? mapping.capabilityId : null)
    return () => onBusy(null)
  }, [sim.running, mapping.capabilityId, onBusy])

  const approve = () => {
    setFailure(null)
    const plan = compositionPlan(mapping.capabilityId, attempts)
    if (plan.failAt !== null) {
      sim.run(plan.failAt + 1, () => {
        setFailure({ at: plan.failAt!, message: plan.message! })
        dispatch({ type: 'compose/compositionFailed', capabilityId: mapping.capabilityId, message: plan.message!, now: now() })
      })
    } else {
      sim.run(plan.steps.length, () =>
        dispatch({ type: 'compose/workerCreated', worker: { capabilityId: mapping.capabilityId, resource: composedWorker(mapping.capabilityId, domain), createdAt: now() }, now: now() }),
      )
    }
  }

  return (
    <section aria-label={`Missing capability: ${mapping.need}`} className="space-y-3">
      <h4 className="flex items-center gap-1 text-[13px] font-semibold text-danger-ink">
        <SearchX aria-hidden className="size-4" />
        {mapping.need} is missing
        <InfoTip label={`Why ${mapping.need} is needed`}>{proposal?.whyNeeded ?? 'The selected approach needs this capability, and no existing resource provides it.'}</InfoTip>
      </h4>

      {rejected ? (
        <div className="space-y-2 text-[13px]">
          <p className="font-medium">You rejected the proposed {proposal?.name ?? 'worker'}.</p>
          <p className="text-muted-foreground">{proposal?.ifRejected}</p>
          <div className="flex flex-wrap gap-1.5">
            {alternative && (
              <Button size="sm" variant="outline" onClick={() => onLookAt(alternative.id)}>
                Look at {alternative.name}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'compose/reconsider', capabilityId: mapping.capabilityId })}>
              Reconsider the proposal
            </Button>
          </div>
        </div>
      ) : proposal ? (
        <>
          <ul aria-label="Checked for reuse first" className="space-y-1">
            {proposal.reuseChecked.map((r) => (
              <li key={r.resource} title={r.reason} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleX aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">
                  <span className="font-medium text-foreground">{r.resource}</span> doesn’t fit
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-dashed border-studio-ink/25 bg-white/70 p-3">
            <div className="flex items-start gap-2.5">
              <IconTile icon={Sparkles} size="sm" tone="ai" />
              <div className="min-w-0">
                <h4 className="text-[13px] leading-tight font-semibold">{proposal.name}</h4>
                <p className="text-[11px] text-muted-foreground">Proposed — not created</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-snug" title={proposal.purpose}>
              {proposal.purpose}
            </p>
            <button type="button" aria-expanded={showMore} onClick={() => setShowMore(!showMore)} className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary outline-none hover:underline focus-visible:underline">
              What it would do
              <ChevronDown aria-hidden className={cn('size-3 transition-transform', showMore && 'rotate-180')} />
            </button>
            {showMore && (
              <div className="mt-2 flex flex-wrap gap-1">
                {[...proposal.responsibilities, ...proposal.agentAccess, ...proposal.knowledge, ...steps].map((x) => (
                  <span key={x} className="rounded-md bg-muted px-1.5 text-[11px] leading-5">
                    {x}
                  </span>
                ))}
              </div>
            )}
          </div>

          {sim.running || failure ? (
            <div aria-busy={sim.running} className="rounded-2xl bg-white/70 p-3">
              <p className="mb-2 text-[13px] font-semibold">{failure ? `Composition of ${proposal.name} failed` : `Composing ${proposal.name}…`}</p>
              <ThinkingChain compact title="" label="Worker composition" steps={compositionPlan(mapping.capabilityId, 0).steps} current={sim.step} failedAt={failure?.at ?? null} />
              {failure && !sim.running && (
                <div role="alert" className="mt-3 rounded-xl bg-danger-soft/70 p-2.5 text-xs">
                  <p className="text-danger-ink">{failure.message}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" onClick={approve}>
                      {proposal.firstAttemptFailure?.retryLabel ?? 'Retry'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFailure(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" className="rounded-full" onClick={approve}>
                Approve and compose worker
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'compose/rejectWorker', capabilityId: mapping.capabilityId, now: now() })}>
                Reject
              </Button>
              <InfoTip label="About worker composition">Your approval is required before the OS asks the AI Workers Platform for a new worker.</InfoTip>
            </div>
          )}
        </>
      ) : (
        alternative && (
          <Button variant="outline" onClick={() => onLookAt(alternative.id)}>
            Look at {alternative.name}
          </Button>
        )
      )}
    </section>
  )
}

function DetailView({
  mapping,
  option,
  alternatives,
  onBack,
  onDetails,
  onLookAt,
  onBusy,
}: {
  mapping: CapabilityMapping
  option: SolutionOption | undefined
  alternatives: SolutionOption[]
  onBack: () => void
  onDetails: (r: PlatformResource) => void
  onLookAt: (id: string) => void
  onBusy: (capabilityId: string | null) => void
}) {
  const { dispatch } = useStudio()
  const now = () => new Date().toISOString()
  const r = mapping.resource
  const steps = stepNames(option, mapping)
  const Icon = r ? kindIcon[r.kind] : SearchX
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-0.5 rounded-md text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <ChevronLeft aria-hidden className="size-4" />
        All needs
      </button>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-tight font-semibold">{mapping.need}</h3>
        <StatusBadge tone={mappingStatusMeta[mapping.status].tone}>{mappingStatusMeta[mapping.status].label}</StatusBadge>
      </div>
      {steps.length > 0 && (
        <ul aria-label="Workflow steps" className="flex flex-wrap gap-1">
          {steps.map((s) => (
            <li key={s} className="rounded-md bg-white/70 px-1.5 text-[11px] leading-5">
              {s}
            </li>
          ))}
        </ul>
      )}
      {r && (
        <button type="button" onClick={() => onDetails(r)} className="flex w-full items-center gap-2.5 rounded-2xl bg-white/80 p-2.5 text-left outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50">
          <IconTile icon={Icon} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] leading-tight font-semibold">{r.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {resourceKindLabel[r.kind]} · v{r.version}
              {mapping.created ? ' · composed for this application' : ''}
            </span>
          </span>
        </button>
      )}

      {mapping.status === 'available' && (
        <Button size="sm" className="rounded-full" aria-label={`Select ${r?.name} for ${mapping.need}`} onClick={() => dispatch({ type: 'compose/select', capabilityIds: [mapping.capabilityId], now: now() })}>
          Select
        </Button>
      )}
      {mapping.status === 'selected' && !mapping.created && (
        <Button size="sm" variant="outline" className="rounded-full" aria-label={`Deselect ${r?.name}`} onClick={() => dispatch({ type: 'compose/deselect', capabilityId: mapping.capabilityId })}>
          Deselect
        </Button>
      )}
      {mapping.status === 'requires-configuration' && r && (
        <div className="rounded-2xl bg-warning-soft/80 p-3 text-xs">
          <p className="font-semibold text-warning-ink">Before {r.name} can be used</p>
          <p className="mt-1 leading-snug">{r.configuration ?? r.note}</p>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" onClick={() => dispatch({ type: 'compose/configure', capabilityId: mapping.capabilityId, now: now() })}>
              Confirm and select
            </Button>
            <Button size="sm" variant="ghost" onClick={onBack}>
              Not now
            </Button>
          </div>
        </div>
      )}
      {mapping.status === 'missing' && <GapResolver mapping={mapping} option={option} alternatives={alternatives} onLookAt={onLookAt} onBusy={onBusy} />}
    </div>
  )
}

/** The floating inspector beside the canvas: overall coverage, or one need in detail. */
export function CoveragePanel({
  mappings,
  option,
  alternatives,
  selectedId,
  onSelect,
  onDetails,
  onLookAt,
  onBusy,
  onHide,
}: {
  mappings: CapabilityMapping[]
  option: SolutionOption | undefined
  alternatives: SolutionOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onDetails: (r: PlatformResource) => void
  onLookAt: (id: string) => void
  onBusy: (capabilityId: string | null) => void
  onHide: () => void
}) {
  const { dispatch } = useStudio()
  const now = () => new Date().toISOString()
  const selected = mappings.find((m) => m.id === selectedId)
  const available = mappings.filter((m) => m.status === 'available')

  return (
    <aside aria-label="Coverage" className="liquid-glass absolute right-3 bottom-[4.5rem] z-10 flex w-[20rem] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[26px] !bg-white/70 [top:var(--top-offset)]">
      <button type="button" aria-label="Hide panel" onClick={onHide} className="absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-white/80 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <PanelRightClose className="size-4" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {selected ? (
          <DetailView key={selected.id} mapping={selected} option={option} alternatives={alternatives} onBack={() => onSelect(null)} onDetails={onDetails} onLookAt={onLookAt} onBusy={onBusy} />
        ) : (
          <div className="space-y-3">
            <CoverageDonut mappings={mappings} />
            {available.length > 0 && (
              <Button className={cn(ctaClass, 'w-full')} size="sm" onClick={() => dispatch({ type: 'compose/select', capabilityIds: available.map((m) => m.capabilityId), now: now() })}>
                Select all available ({available.length})
              </Button>
            )}
            <ul aria-label="Capability coverage" className="space-y-1.5">
              {mappings.map((m) => {
                const Icon = m.resource ? kindIcon[m.resource.kind] : SearchX
                return (
                  <li key={m.id} className="flex items-center gap-2 rounded-2xl bg-white/70 p-1.5 hover:bg-white">
                    <button type="button" onClick={() => onSelect(m.id)} aria-label={`Inspect ${m.need}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                      <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-[9px]', m.status === 'selected' ? 'bg-studio-ink text-white' : m.status === 'missing' ? 'bg-danger-soft text-danger-ink' : m.status === 'requires-configuration' ? 'bg-warning-soft text-warning-ink' : 'bg-accent text-accent-foreground')}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs leading-tight font-semibold">{m.need}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {m.resource?.name ?? 'No existing resource'}
                          {m.created ? ' · composed for this application' : ''}
                        </span>
                      </span>
                    </button>
                    {m.status === 'available' && (
                      <Button size="xs" variant="outline" className="bg-white" aria-label={`Select ${m.resource?.name} for ${m.need}`} onClick={() => dispatch({ type: 'compose/select', capabilityIds: [m.capabilityId], now: now() })}>
                        Select
                      </Button>
                    )}
                    {m.status === 'requires-configuration' && (
                      <Button size="xs" variant="outline" className="bg-white" onClick={() => onSelect(m.id)}>
                        Review configuration
                      </Button>
                    )}
                    {m.status === 'missing' && (
                      <Button size="xs" variant="outline" className="border-danger/40 bg-white text-danger-ink hover:text-danger-ink" onClick={() => onSelect(m.id)}>
                        Resolve
                      </Button>
                    )}
                    {m.status === 'selected' && <StatusBadge tone="success">Selected</StatusBadge>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
