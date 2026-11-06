import { useMemo, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import type { DomainId } from '@/app/registry/types'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { AuditCategory, AuditEvent, ExecutionStatus, RuntimeState } from '../types'
import { AuditList } from './AuditList'
import { auditCategoryLabel, executionStatusMeta } from './meta'

type Range = 'any' | 'today' | '7d' | 'older'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * The activity stream (operational view) and the audit log (compliance view) read the same
 * append-only events. Every filter changes the list it shows.
 */
export function EventStream({ state, mode, appId, appName }: { state: RuntimeState; mode: 'activity' | 'audit'; appId?: string; appName: (id: string) => string }) {
  const [query, setQuery] = useState('')
  const [app, setApp] = useState(appId ?? 'all')
  const [domain, setDomain] = useState<DomainId | 'all'>('all')
  const [status, setStatus] = useState<ExecutionStatus | 'all'>('all')
  const [resource, setResource] = useState('all')
  const [range, setRange] = useState<Range>('any')
  const [category, setCategory] = useState<AuditCategory | 'all'>('all')
  const [order, setOrder] = useState<'newest' | 'oldest'>(mode === 'audit' ? 'oldest' : 'newest')

  const execById = useMemo(() => new Map(state.executions.map((e) => [e.id, e])), [state.executions])
  const appIds = [...new Set(state.audit.map((e) => e.appId))]
  const resources = [...new Map(state.executions.flatMap((e) => e.steps).filter((s) => s.resource && s.resource.kind !== 'person').map((s) => [s.resource!.id, s.resource!.name])).entries()]
  const domainOf = (e: AuditEvent): DomainId | undefined => (e.executionId ? execById.get(e.executionId)?.domain : state.executions.find((x) => x.appId === e.appId)?.domain)

  const events = useMemo(() => {
    const q = query.trim().toLowerCase()
    const today = startOfToday()
    const week = today - 6 * 86_400_000
    const list = state.audit.filter((e) => {
      if (app !== 'all' && e.appId !== app) return false
      if (domain !== 'all' && domainOf(e) !== domain) return false
      if (status !== 'all' && (!e.executionId || execById.get(e.executionId)?.status !== status)) return false
      if (resource !== 'all' && e.resourceId !== resource) return false
      if (category !== 'all' && e.category !== category) return false
      const t = new Date(e.at).getTime()
      if (range === 'today' && t < today) return false
      if (range === '7d' && t < week) return false
      if (range === 'older' && t >= today) return false
      if (q && ![e.id, e.action, e.description, e.actor, e.executionId ?? '', e.approvalId ?? '', (e.executionId && execById.get(e.executionId)?.transaction.id) || ''].some((s) => s.toLowerCase().includes(q))) return false
      return true
    })
    return order === 'newest' ? [...list].reverse() : list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.audit, query, app, domain, status, resource, range, category, order, execById])

  const clear = () => {
    setQuery('')
    setApp(appId ?? 'all')
    setDomain('all')
    setStatus('all')
    setResource('all')
    setRange('any')
    setCategory('all')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={mode === 'audit' ? 'Audit filters' : 'Activity filters'}>
        <div className="relative w-full max-w-56">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label={mode === 'audit' ? 'Search audit records' : 'Search activity'} className="pl-8" />
        </div>
        {!appId && (
          <NativeSelect aria-label="Application" value={app} onChange={(e) => setApp(e.target.value)}>
            <NativeSelectOption value="all">All applications</NativeSelectOption>
            {appIds.map((id) => (
              <NativeSelectOption key={id} value={id}>
                {appName(id)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        {!appId && (
          <NativeSelect aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value as DomainId | 'all')}>
            <NativeSelectOption value="all">All domains</NativeSelectOption>
            <NativeSelectOption value="insurance">Insurance</NativeSelectOption>
            <NativeSelectOption value="healthcare">Healthcare</NativeSelectOption>
            <NativeSelectOption value="banking">Banking</NativeSelectOption>
          </NativeSelect>
        )}
        <NativeSelect aria-label="Event type" value={category} onChange={(e) => setCategory(e.target.value as AuditCategory | 'all')}>
          <NativeSelectOption value="all">All event types</NativeSelectOption>
          {(Object.keys(auditCategoryLabel) as AuditCategory[]).map((c) => (
            <NativeSelectOption key={c} value={c}>
              {auditCategoryLabel[c]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Execution status" value={status} onChange={(e) => setStatus(e.target.value as ExecutionStatus | 'all')}>
          <NativeSelectOption value="all">Any execution status</NativeSelectOption>
          {(Object.keys(executionStatusMeta) as ExecutionStatus[]).map((s) => (
            <NativeSelectOption key={s} value={s}>
              {executionStatusMeta[s].label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Resource" value={resource} onChange={(e) => setResource(e.target.value)}>
          <NativeSelectOption value="all">Any resource</NativeSelectOption>
          {resources.map(([id, name]) => (
            <NativeSelectOption key={id} value={id}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)}>
          <NativeSelectOption value="any">Any time</NativeSelectOption>
          <NativeSelectOption value="today">Today</NativeSelectOption>
          <NativeSelectOption value="7d">Last 7 days</NativeSelectOption>
          <NativeSelectOption value="older">Before today</NativeSelectOption>
        </NativeSelect>
        <NativeSelect aria-label="Order" value={order} onChange={(e) => setOrder(e.target.value as 'newest' | 'oldest')}>
          <NativeSelectOption value="newest">Newest first</NativeSelectOption>
          <NativeSelectOption value="oldest">Chronological</NativeSelectOption>
        </NativeSelect>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {events.length} of {state.audit.filter((e) => !appId || e.appId === appId).length} events
        </span>
      </div>
      {events.length === 0 ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No events match</EmptyTitle>
            <EmptyDescription>Change or clear the filters.</EmptyDescription>
          </EmptyHeader>
          <Button size="sm" variant="outline" onClick={clear}>
            Clear filters
          </Button>
        </Empty>
      ) : (
        <AuditList events={events.slice(0, 200)} appName={appId ? undefined : appName} label={mode === 'audit' ? 'Audit records' : 'Activity stream'} />
      )}
      {events.length > 200 && <p className="text-xs text-muted-foreground">Showing the first 200 events. Narrow the filters to see others.</p>}
    </div>
  )
}
