import { useMemo, useState } from 'react'
import { ClipboardCheck, FilePlus2, Inbox, ListChecks, Search, SearchX } from 'lucide-react'
import { AppRuntimePanel, type RuntimeView } from '@/app/runtime/components/AppRuntimePanel'
import { useRuntime } from '@/app/runtime/store'
import { useParamsChange } from '@/app/windows/use-params-change'
import type { AppProps } from '@/app/registry/types'
import { useMockServices } from '@/app/services/use-mock-services'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { claimStageLabel, formatCurrency, type Claim, type ClaimStage } from '@/data/claims.mock'
import { cn } from '@/lib/utils'
import { ClaimDetail } from './ClaimDetail'
import { riskLabel, riskTone, stageTone } from './claimStatus'

type View = 'queue' | 'approvals' | 'runtime'

const stageFilters: { id: 'all' | 'open' | ClaimStage; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'In progress' },
  { id: 'awaiting-approval', label: 'Awaiting approval' },
  { id: 'settled', label: 'Settled' },
  { id: 'referred', label: 'Referred' },
]

const openStages: ClaimStage[] = ['intake', 'coverage', 'fraud-screening', 'assessment']

function NavItem({
  active,
  icon: Icon,
  label,
  count,
  hideCount = false,
  onClick,
}: {
  active: boolean
  icon: typeof Inbox
  label: string
  count: number
  hideCount?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon aria-hidden className="size-4" />
      <span className="flex-1">{label}</span>
      {!hideCount && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
    </button>
  )
}

function QueueTable({
  claims,
  selectedId,
  onSelect,
}: {
  claims: Claim[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="px-4 py-2 font-medium">Claim</th>
          <th className="hidden px-2 py-2 font-medium @lg/list:table-cell">Product</th>
          <th className="px-2 py-2 text-right font-medium">Claimed</th>
          <th className="py-2 pr-4 pl-2 font-medium @xl/list:pr-2">Stage</th>
          <th className="hidden px-2 py-2 font-medium @2xl/list:table-cell">Risk</th>
          <th className="hidden px-4 py-2 text-right font-medium @xl/list:table-cell">SLA</th>
        </tr>
      </thead>
      <tbody>
        {claims.map((claim) => (
          <tr
            key={claim.id}
            aria-selected={claim.id === selectedId}
            onClick={() => onSelect(claim.id)}
            className={cn('cursor-pointer border-b last:border-0', claim.id === selectedId ? 'bg-accent' : 'hover:bg-muted/60')}
          >
            <td className="px-4 py-2.5">
              <button
                type="button"
                className="text-left outline-none focus-visible:underline"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(claim.id)
                }}
              >
                <span className="block font-medium whitespace-nowrap">{claim.claimant}</span>
                <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {claim.id} · {claim.lossType}
                </span>
              </button>
            </td>
            <td className="hidden px-2 py-2.5 text-muted-foreground @lg/list:table-cell">{claim.product}</td>
            <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(claim.amount)}</td>
            <td className="py-2.5 pr-4 pl-2 @xl/list:pr-2">
              <StatusBadge tone={stageTone[claim.stage]}>{claimStageLabel[claim.stage]}</StatusBadge>
            </td>
            <td className="hidden px-2 py-2.5 @2xl/list:table-cell">
              <StatusBadge tone={riskTone[claim.risk]}>{riskLabel[claim.risk]}</StatusBadge>
            </td>
            <td className="hidden px-4 py-2.5 text-right text-muted-foreground tabular-nums @xl/list:table-cell">
              {claim.slaHoursRemaining > 0 ? `${claim.slaHoursRemaining} h` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ApprovalList({
  claims,
  selectedId,
  onSelect,
}: {
  claims: Claim[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ul className="space-y-2 p-4">
      {claims.map((claim) => (
        <li key={claim.id}>
          <button
            type="button"
            onClick={() => onSelect(claim.id)}
            className={cn(
              'w-full rounded-lg border p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              claim.id === selectedId ? 'border-primary/40 bg-accent' : 'hover:bg-muted/60',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{claim.claimant}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{claim.id}</span>
              <span className="ml-auto text-sm font-medium tabular-nums">{formatCurrency(claim.amount)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {claim.recommendation?.decision === 'refer' ? 'Recommended: refer' : 'Recommended: approve'} ·{' '}
              {claim.product} · {claim.lossType}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone={riskTone[claim.risk]}>{riskLabel[claim.risk]}</StatusBadge>
              <StatusBadge tone={claim.slaHoursRemaining <= 8 ? 'danger' : 'neutral'}>
                Due in {claim.slaHoursRemaining} h
              </StatusBadge>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ClaimsIntelligenceApp({ params }: AppProps) {
  const { claims, pendingApprovals } = useMockServices()
  const [view, setView] = useState<View>(params.view === 'approvals' ? 'approvals' : params.view === 'submit' || params.view === 'executions' ? 'runtime' : 'queue')
  const [runtimeView, setRuntimeView] = useState<RuntimeView>(params.view === 'submit' ? { kind: 'new' } : { kind: 'list' })
  const runtime = useRuntime()
  const runCount = runtime.executions.filter((e) => e.appId === 'claims-intelligence').length
  const [selectedId, setSelectedId] = useState<string | null>(params.claim ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof stageFilters)[number]['id']>('all')

  // Deep links (widgets, notifications, assistant) re-target an already open window.
  useParamsChange(params, (p) => {
    if (p.view === 'approvals' || p.view === 'queue') setView(p.view)
    if (p.view === 'submit' || p.view === 'executions') {
      setView('runtime')
      setRuntimeView(p.view === 'submit' ? { kind: 'new' } : { kind: 'list' })
    }
    if (p.claim) setSelectedId(p.claim)
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return claims.filter((c) => {
      if (filter === 'open' && !openStages.includes(c.stage)) return false
      if (filter !== 'all' && filter !== 'open' && c.stage !== filter) return false
      if (!q) return true
      return [c.id, c.claimant, c.policyNumber, c.lossType, c.product].some((v) => v.toLowerCase().includes(q))
    })
  }, [claims, query, filter])

  const selected = claims.find((c) => c.id === selectedId) ?? null

  const switchView = (next: View) => {
    setView(next)
    setSelectedId(null)
  }
  const openRuntime = (next: RuntimeView) => {
    setView('runtime')
    setRuntimeView(next)
  }

  return (
    <div className="@container flex h-full min-h-0">
      <nav aria-label="Claims Intelligence" className="hidden w-52 shrink-0 flex-col gap-1 border-r bg-chrome p-3 @3xl:flex">
        <NavItem active={view === 'queue'} icon={Inbox} label="Claims queue" count={claims.length} onClick={() => switchView('queue')} />
        <NavItem
          active={view === 'approvals'}
          icon={ClipboardCheck}
          label="Approvals"
          count={pendingApprovals.length}
          onClick={() => switchView('approvals')}
        />
        <div className="my-2 border-t" />
        <NavItem active={view === 'runtime' && runtimeView.kind === 'new'} icon={FilePlus2} label="Submit a claim" count={0} hideCount onClick={() => openRuntime({ kind: 'new' })} />
        <NavItem active={view === 'runtime' && runtimeView.kind !== 'new'} icon={ListChecks} label="Executions" count={runCount} onClick={() => openRuntime({ kind: 'list' })} />
        <div className="mt-auto space-y-1 px-1 text-xs text-muted-foreground">
          <MockBadge />
          <p>Runs blueprint v{runtime.builtin['claims-intelligence']?.published.version} (AI-Driven Claims Automation)</p>
        </div>
      </nav>

      {view === 'runtime' ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 border-b px-4 py-2 @3xl:hidden">
            <Button size="xs" variant="ghost" onClick={() => switchView('queue')}>
              Queue
            </Button>
            <Button size="xs" variant={runtimeView.kind === 'new' ? 'secondary' : 'ghost'} onClick={() => openRuntime({ kind: 'new' })}>
              Submit a claim
            </Button>
            <Button size="xs" variant={runtimeView.kind !== 'new' ? 'secondary' : 'ghost'} onClick={() => openRuntime({ kind: 'list' })}>
              Executions
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <AppRuntimePanel appId="claims-intelligence" view={runtimeView} onView={setRuntimeView} />
          </div>
        </div>
      ) : (
      <div className="flex min-w-0 flex-1">
        <div className={cn('min-w-0 flex-1 flex-col', selected ? 'hidden @5xl:flex' : 'flex')}>
          <div className="space-y-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{view === 'queue' ? 'Claims queue' : 'Approvals'}</h3>
              <div className="ml-auto flex gap-1 @3xl:hidden">
                <Button size="xs" variant={view === 'queue' ? 'secondary' : 'ghost'} onClick={() => switchView('queue')}>
                  Queue
                </Button>
                <Button size="xs" variant={view === 'approvals' ? 'secondary' : 'ghost'} onClick={() => switchView('approvals')}>
                  Approvals · {pendingApprovals.length}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => openRuntime({ kind: 'list' })}>
                  Executions
                </Button>
              </div>
            </div>
            {view === 'queue' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-64">
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search claim, claimant, policy"
                    aria-label="Search claims"
                    className="pl-8"
                  />
                </div>
                <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-1">
                  {stageFilters.map((f) => (
                    <Button
                      key={f.id}
                      size="xs"
                      variant={filter === f.id ? 'secondary' : 'ghost'}
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {view === 'approvals' && (
              <p className="text-sm text-muted-foreground">
                Settlements that need a human decision before the workflow can continue.
              </p>
            )}
          </div>

          <div className="@container/list min-h-0 flex-1 overflow-y-auto">
            {view === 'queue' &&
              (filtered.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchX />
                    </EmptyMedia>
                    <EmptyTitle>No claims match</EmptyTitle>
                    <EmptyDescription>Try a different search or stage filter.</EmptyDescription>
                  </EmptyHeader>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuery('')
                      setFilter('all')
                    }}
                  >
                    Clear filters
                  </Button>
                </Empty>
              ) : (
                <QueueTable claims={filtered} selectedId={selectedId} onSelect={setSelectedId} />
              ))}
            {view === 'approvals' &&
              (pendingApprovals.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardCheck />
                    </EmptyMedia>
                    <EmptyTitle>No approvals waiting</EmptyTitle>
                    <EmptyDescription>Every settlement decision is up to date.</EmptyDescription>
                  </EmptyHeader>
                  <Button size="sm" variant="outline" onClick={() => switchView('queue')}>
                    View claims queue
                  </Button>
                </Empty>
              ) : (
                <ApprovalList claims={pendingApprovals} selectedId={selectedId} onSelect={setSelectedId} />
              ))}
          </div>
        </div>

        {selected && (
          <div className="flex w-full min-w-0 flex-col @5xl:w-[24rem] @5xl:shrink-0 @5xl:border-l">
            <ClaimDetail claim={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
      )}
    </div>
  )
}
