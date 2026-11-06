import { useMemo, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Execution, ExecutionStatus, RuntimeState } from '../types'
import { executionStatusMeta, formatDateTime, formatDuration } from './meta'

type Sort = 'newest' | 'oldest' | 'status' | 'duration'
const statusOrder: ExecutionStatus[] = ['waiting-approval', 'failed', 'running', 'paused', 'queued', 'completed', 'cancelled']
const durationMs = (e: Execution) => (e.endedAt ? new Date(e.endedAt).getTime() - new Date(e.submittedAt).getTime() : Infinity)

/** Execution history with search, status filter and sorting. */
export function ExecutionList({
  executions,
  state,
  onOpen,
  showApplication = false,
  initialStatus = 'all',
  label = 'Executions',
}: {
  executions: Execution[]
  state: RuntimeState
  onOpen: (id: string) => void
  showApplication?: boolean
  initialStatus?: ExecutionStatus | 'all'
  label?: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ExecutionStatus | 'all'>(initialStatus)
  const [sort, setSort] = useState<Sort>('newest')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return executions
      .filter((e) => status === 'all' || e.status === status)
      .filter((e) => !q || [e.id, e.transaction.id, e.transaction.label, e.appName].some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === 'oldest'
          ? a.submittedAt.localeCompare(b.submittedAt)
          : sort === 'status'
            ? statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || b.submittedAt.localeCompare(a.submittedAt)
            : sort === 'duration'
              ? durationMs(a) - durationMs(b)
              : b.submittedAt.localeCompare(a.submittedAt),
      )
  }, [executions, query, status, sort])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-64">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search execution or transaction" aria-label="Search executions" className="pl-8" />
        </div>
        <NativeSelect aria-label="Execution status" value={status} onChange={(e) => setStatus(e.target.value as ExecutionStatus | 'all')}>
          <NativeSelectOption value="all">Any status</NativeSelectOption>
          {statusOrder.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {executionStatusMeta[s].label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Sort executions" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <NativeSelectOption value="newest">Newest first</NativeSelectOption>
          <NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
          <NativeSelectOption value="status">Needs attention first</NativeSelectOption>
          <NativeSelectOption value="duration">Shortest duration</NativeSelectOption>
        </NativeSelect>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {rows.length} of {executions.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{executions.length ? 'No executions match' : 'No executions yet'}</EmptyTitle>
            <EmptyDescription>{executions.length ? 'Try another search or status.' : 'Submit a transaction to start one.'}</EmptyDescription>
          </EmptyHeader>
          {executions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery('')
                setStatus('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </Empty>
      ) : (
        <ul aria-label={label} className="divide-y rounded-lg border bg-card">
          {rows.map((e) => {
            const meta = executionStatusMeta[e.status]
            const outcome = state.outcomes.find((o) => o.id === e.outcomeId)
            const step = e.steps[e.current]
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onOpen(e.id)}
                  aria-label={`${e.transaction.id} — ${meta.label}`}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block text-sm font-medium">
                      {e.transaction.id} <span className="font-normal text-muted-foreground">· {e.transaction.label}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.id}
                      {showApplication ? ` · ${e.appName}` : ''} · {formatDateTime(e.submittedAt)}
                      {formatDuration(e.submittedAt, e.endedAt) ? ` · ${formatDuration(e.submittedAt, e.endedAt)}` : ''}
                    </span>
                  </span>
                  <span className="w-40 truncate text-xs text-muted-foreground">
                    {outcome ? outcome.label : e.status === 'completed' ? '' : e.status === 'cancelled' ? 'No outcome' : step?.name}
                  </span>
                  <StatusBadge tone={meta.tone} pulse={e.status === 'running'}>
                    {meta.label}
                  </StatusBadge>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
