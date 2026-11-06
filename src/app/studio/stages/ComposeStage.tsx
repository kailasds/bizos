import { useState } from 'react'
import { ArrowRight, BookOpen, Bot, CheckCheck, Cpu, Plug, Puzzle, Search, SearchX, Server, UserCheck, FileSearch, type LucideIcon } from 'lucide-react'
import { Expander } from '@/components/os/Expander'
import type { ResourceKind, SolutionOption } from '@/app/blueprint/types'
import { ResourceDetailSheet } from '@/app/resources/ResourceDetailSheet'
import { composedWorker, compositionPlan, coverageCounts, proposalFor } from '@/app/services/mock/capability-analysis-service'
import { searchCatalogue } from '@/app/services/mock/resource-discovery-service'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { InfoTip } from '@/components/os/InfoTip'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { availabilityLabel, resourceKindLabel, type PlatformResource } from '@/data/resources.mock'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList, StepProgress } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import type { CapabilityMapping, MappingStatus } from '../types'
import { useStudio } from '../use-studio'

const kindIcon: Record<ResourceKind, LucideIcon> = { agent: Bot, worker: Cpu, connector: Plug, knowledge: BookOpen, service: Server }

const mappingStatusMeta: Record<MappingStatus, { tone: StatusTone; label: string }> = {
  selected: { tone: 'success', label: 'Selected' },
  available: { tone: 'info', label: 'Available' },
  'requires-configuration': { tone: 'warning', label: 'Requires configuration' },
  missing: { tone: 'danger', label: 'Missing' },
}

const stepNames = (option: SolutionOption | undefined, m: CapabilityMapping) =>
  m.stepIds.map((id) => option?.steps.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n))

// ── Coverage ──────────────────────────────────────────────────────────────

function CoverageRow({ mapping, option, onDetails }: { mapping: CapabilityMapping; option: SolutionOption | undefined; onDetails: (r: PlatformResource) => void }) {
  const { dispatch } = useStudio()
  const [reviewing, setReviewing] = useState(false)
  const now = () => new Date().toISOString()
  const steps = stepNames(option, mapping)
  const r = mapping.resource
  const Icon = kindIcon[r?.kind ?? mapping.category]

  return (
    <li className="px-4 py-3">
      <div className="grid items-start gap-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_15rem]">
        <div className="min-w-0">
          <p className="text-sm font-medium">{mapping.need}</p>
          <p className="text-xs text-muted-foreground">{steps.length ? `Supports: ${steps.join(', ')}` : 'Supports the whole application'}</p>
        </div>
        <div className="flex min-w-0 gap-2">
          {r ? (
            <>
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <button type="button" onClick={() => onDetails(r)} className="text-left text-sm outline-none hover:underline focus-visible:underline">
                  {r.name}
                </button>
                <p className="text-xs text-muted-foreground">
                  {resourceKindLabel[r.kind]}
                  {mapping.created ? ' · composed for this application' : ''}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No existing resource</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 @3xl:justify-end">
          <StatusBadge tone={mappingStatusMeta[mapping.status].tone}>{mappingStatusMeta[mapping.status].label}</StatusBadge>
          {mapping.status === 'available' && (
            <Button size="xs" variant="outline" aria-label={`Select ${r?.name} for ${mapping.need}`} onClick={() => dispatch({ type: 'compose/select', capabilityIds: [mapping.capabilityId], now: now() })}>
              Select
            </Button>
          )}
          {mapping.status === 'requires-configuration' && (
            <Button size="xs" variant="outline" aria-expanded={reviewing} onClick={() => setReviewing(!reviewing)}>
              Review configuration
            </Button>
          )}
          {mapping.status === 'selected' && !mapping.created && (
            <Button size="xs" variant="ghost" aria-label={`Deselect ${r?.name}`} onClick={() => dispatch({ type: 'compose/deselect', capabilityId: mapping.capabilityId })}>
              Deselect
            </Button>
          )}
          {mapping.status === 'missing' && (
            <Button size="xs" variant="outline" onClick={() => document.getElementById(`gap-${mapping.capabilityId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Resolve
            </Button>
          )}
        </div>
      </div>
      {reviewing && mapping.status === 'requires-configuration' && r && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning-soft/50 p-3 text-sm">
          <p className="font-medium text-warning-ink">Before {r.name} can be used</p>
          <p className="mt-1">{r.configuration ?? r.note}</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                dispatch({ type: 'compose/configure', capabilityId: mapping.capabilityId, now: now() })
                setReviewing(false)
              }}
            >
              Confirm and select
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>
              Not now
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function GapResolver({ mapping, option, alternatives, onLookAt }: { mapping: CapabilityMapping; option: SolutionOption | undefined; alternatives: SolutionOption[]; onLookAt: (id: string) => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(700)
  const [failure, setFailure] = useState<{ at: number; message: string } | null>(null)
  const proposal = proposalFor(mapping.capabilityId)
  const rejected = project?.composition?.rejected.includes(mapping.capabilityId)
  const attempts = project?.composition?.attempts[mapping.capabilityId] ?? 0
  const steps = stepNames(option, mapping)
  const alternative = alternatives.find((o) => !o.steps.some((s) => s.capabilityId === mapping.capabilityId))
  const domain = project?.discover.domain ?? 'insurance'
  const now = () => new Date().toISOString()

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
    <section id={`gap-${mapping.capabilityId}`} aria-label={`Missing capability: ${mapping.need}`} className="scroll-mt-4 rounded-xl border border-danger/30 bg-card">
      <header className="flex items-start gap-2 border-b px-4 py-3">
        <SearchX aria-hidden className="mt-0.5 size-4 shrink-0 text-danger-ink" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-sm font-semibold">
            {mapping.need} is missing
            <InfoTip label={`Why ${mapping.need} is needed`}>{proposal?.whyNeeded ?? 'The selected approach needs this capability, and no existing resource provides it.'}</InfoTip>
          </h3>
          {steps.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Workflow steps affected">
              {steps.map((st) => (
                <li key={st} className="rounded-full bg-muted px-2 text-xs leading-5 text-muted-foreground">
                  {st}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {rejected ? (
        <div className="space-y-3 px-4 py-4 text-sm">
          <p>
            <span className="font-medium">You rejected the proposed {proposal?.name ?? 'worker'}.</span> {proposal?.ifRejected}
          </p>
          <div className="flex flex-wrap gap-2">
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
        <div className="space-y-4 px-4 py-4">
          {sim.running || failure ? (
            <div aria-busy={sim.running}>
              <p className="mb-2 text-sm font-medium">{failure ? `Composition of ${proposal.name} failed` : `Composing ${proposal.name}…`}</p>
              <StepList label="Worker composition" steps={compositionPlan(mapping.capabilityId, 0).steps} current={sim.step} failedAt={failure?.at ?? null} />
              {failure && !sim.running && (
                <div role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/60 p-3 text-sm">
                  <p className="text-danger-ink">{failure.message}</p>
                  <div className="mt-2 flex gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={approve}>Approve and compose worker</Button>
              <Button variant="ghost" onClick={() => dispatch({ type: 'compose/rejectWorker', capabilityId: mapping.capabilityId, now: now() })}>
                Reject
              </Button>
              <InfoTip label="About worker composition">Your approval is required before the OS asks the AI Workers Platform for a new worker.</InfoTip>
            </div>
          )}
          <div className="rounded-lg border border-dashed border-foreground/25 bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold">{proposal.name}</h4>
              <span className="rounded-full border border-dashed border-foreground/30 px-2 text-xs leading-5 text-muted-foreground">Proposed — not created</span>
            </div>
            <p className="mt-1 text-sm">{proposal.purpose}</p>
          </div>
          <Expander title="Proposal details" icon={FileSearch} meta="Responsibilities, access and reuse checks">
            <dl className="grid gap-3 text-sm @3xl:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Responsibilities</dt>
                <dd>
                  <ul className="list-disc pl-4">
                    {proposal.responsibilities.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Would support</dt>
                  <dd>{steps.join(', ') || mapping.need}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Agent access</dt>
                  <dd>{proposal.agentAccess.join(' · ')}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Knowledge</dt>
                  <dd>{proposal.knowledge.join(' · ')}</dd>
                </div>
              </div>
            </dl>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Checked for reuse first</h4>
            <ul className="mt-1 space-y-1 text-sm">
              {proposal.reuseChecked.map((r) => (
                <li key={r.resource}>
                  <span className="font-medium">{r.resource}</span> — {r.reason}
                </li>
              ))}
            </ul>
          </div>

          </Expander>
        </div>
      ) : (
        <div className="flex gap-2 px-4 py-3">
          {alternative && (
            <Button variant="outline" onClick={() => onLookAt(alternative.id)}>
              Look at {alternative.name}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// ── Catalogue ─────────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-72">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or what it does" aria-label="Search resources" className="pl-8" />
        </div>
        <div role="group" aria-label="Resource type" className="flex flex-wrap gap-1">
          {kindFilters.map((f) => (
            <Button key={f.id} size="xs" variant={kind === f.id ? 'secondary' : 'ghost'} aria-pressed={kind === f.id} onClick={() => setKind(f.id)}>
              {f.label} <span className="text-muted-foreground tabular-nums">{f.id === 'all' ? inDomain.length : inDomain.filter((r) => r.kind === f.id).length}</span>
            </Button>
          ))}
        </div>
      </div>
      {results.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
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
        <ul className="divide-y rounded-lg border bg-card">
          {results.map((r) => {
            const Icon = kindIcon[r.kind]
            const m = usedFor(r.id)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onDetails(r)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {r.name} <span className="font-normal text-muted-foreground">· {resourceKindLabel[r.kind]} · v{r.version}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground">{r.purpose}</span>
                    <span className={cn('mt-1 block text-xs', m ? 'text-foreground' : 'text-muted-foreground')}>
                      {m ? `Used here for ${m.need} · ${mappingStatusMeta[m.status].label}` : 'Not used in this application'}
                      <span className="text-muted-foreground"> · {r.owner}</span>
                    </span>
                  </span>
                  {r.availability !== 'available' && <StatusBadge tone="warning">{availabilityLabel[r.availability]}</StatusBadge>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Stage ─────────────────────────────────────────────────────────────────

const compileSteps = ['Compiling the workflow', 'Deriving the data model', 'Building screens from the component catalogue', 'Assembling the blueprint']

export function ComposeStage({ onFocusOption }: { onFocusOption: (id: string) => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(600)
  const [view, setView] = useState<'coverage' | 'catalogue'>('coverage')
  const [detail, setDetail] = useState<PlatformResource | null>(null)

  if (!project?.composition || !project.discover.domain) {
    return <StagePrerequisite stage="compose" requires="architect" message="Choose a solution approach first. Resources are discovered for the approach you select." />
  }

  const { mappings } = project.composition
  const option = project.architecture?.options.find((o) => o.id === project.architecture?.selectedOptionId)
  const alternatives = project.architecture?.options.filter((o) => o.id !== option?.id) ?? []
  const counts = coverageCounts(mappings)
  const missing = mappings.filter((m) => m.status === 'missing')
  const available = mappings.filter((m) => m.status === 'available')
  const configuring = mappings.filter((m) => m.status === 'requires-configuration')
  const remaining = mappings.length - counts.selected
  const detailMapping = detail ? mappings.find((m) => m.resource?.id === detail.id) : undefined
  const now = () => new Date().toISOString()
  const lookAt = (id: string) => {
    onFocusOption(id)
    dispatch({ type: 'stage/go', stage: 'architect' })
  }

  const blockers = [
    counts.available && `select ${counts.available} available resource${counts.available === 1 ? '' : 's'}`,
    counts['requires-configuration'] && `confirm ${counts['requires-configuration']} configuration${counts['requires-configuration'] === 1 ? '' : 's'}`,
    counts.missing && `resolve ${counts.missing} missing capabilit${counts.missing === 1 ? 'y' : 'ies'}`,
  ].filter(Boolean)

  return (
    <StageFrame
      stage="compose"
      aside={
        <div role="group" aria-label="View" className="flex gap-1">
          <Button size="sm" variant={view === 'coverage' ? 'secondary' : 'ghost'} aria-pressed={view === 'coverage'} onClick={() => setView('coverage')}>
            Coverage
          </Button>
          <Button size="sm" variant={view === 'catalogue' ? 'secondary' : 'ghost'} aria-pressed={view === 'catalogue'} onClick={() => setView('catalogue')}>
            Resource catalogue
          </Button>
        </div>
      }
      footer={
        sim.running ? (
          <StepProgress label="Generating blueprint" steps={compileSteps} current={sim.step} />
        ) : (
          <>
            {remaining > 0 && <span className="mr-auto text-sm text-muted-foreground">To continue, {blockers.join(', ')}.</span>}
            <Button disabled={remaining > 0} onClick={() => sim.run(compileSteps.length, () => dispatch({ type: 'compose/confirm', now: now() }))}>
              {project.blueprint ? 'Regenerate blueprint' : 'Generate blueprint'}
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      {view === 'catalogue' ? (
        <CatalogueBrowser mappings={mappings} onDetails={setDetail} />
      ) : (
        <div className="space-y-6">
          {(missing.length > 0 || configuring.length > 0 || available.length > 0) && (
            <section aria-label="Needs your decision" className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck aria-hidden className="size-4 text-primary" />
                Needs your decision
              </h3>
              {available.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-accent/50 px-4 py-3">
                  <CheckCheck aria-hidden className="size-5 text-primary" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold tabular-nums">{available.length}</span> existing resources are ready to use
                  </span>
                  <Button onClick={() => dispatch({ type: 'compose/select', capabilityIds: available.map((m) => m.capabilityId), now: now() })}>
                    Select all available ({available.length})
                  </Button>
                </div>
              )}
              {configuring.length > 0 && (
                <ul className="divide-y rounded-2xl border bg-card" aria-label="Configuration to confirm">
                  {configuring.map((m) => (
                    <CoverageRow key={m.id} mapping={m} option={option} onDetails={setDetail} />
                  ))}
                </ul>
              )}
              {missing.map((m) => (
                <GapResolver key={m.id} mapping={m} option={option} alternatives={alternatives} onLookAt={lookAt} />
              ))}
            </section>
          )}

          {project.composition.createdWorkers.length > 0 && (
            <ul aria-label="Composed workers" className="space-y-2">
              {project.composition.createdWorkers.map((w) => (
                <li key={w.capabilityId} className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success-soft/50 px-4 py-2.5 text-sm">
                  <CheckCheck aria-hidden className="size-4 text-success-ink" />
                  <span className="font-medium">{w.resource.name}</span>
                  <span className="text-muted-foreground">· composed for this application</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(mappingStatusMeta) as MappingStatus[]).map((s) =>
              counts[s] ? (
                <StatusBadge key={s} tone={mappingStatusMeta[s].tone}>
                  <span className="tabular-nums">{counts[s]}</span> {mappingStatusMeta[s].label.toLowerCase()}
                </StatusBadge>
              ) : null,
            )}
            <InfoTip label="About resource selection">Existing resources are preferred over new ones. Selecting a resource pins its current version into the blueprint; the owning platform keeps managing it.</InfoTip>
          </div>

          <Expander title="Capability coverage" icon={Puzzle} meta={`${mappings.length} needs${option ? ` · ${option.name}` : ''}`}>
            <ul className="-mx-4 -my-4 divide-y" aria-label="Capability coverage">
              {mappings.map((m) => (
                <CoverageRow key={m.id} mapping={m} option={option} onDetails={setDetail} />
              ))}
            </ul>
          </Expander>
        </div>
      )}
      <ResourceDetailSheet
        resource={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        context={detailMapping ? { label: 'Supports in this application', items: stepNames(option, detailMapping).length ? stepNames(option, detailMapping) : [detailMapping.need] } : undefined}
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
  )
}
