import { useMemo, useState } from 'react'
import { ArrowLeft, FileText, FileWarning, Inbox, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useParamsChange } from '@/app/windows/use-params-change'
import type { AppProps } from '@/app/registry/types'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { documents as initialDocuments, type ExtractionStatus, type MockDocument } from '@/data/documents.mock'
import { cn } from '@/lib/utils'

const statusTone: Record<ExtractionStatus, StatusTone> = {
  extracted: 'success',
  'needs-review': 'warning',
  processing: 'info',
  failed: 'danger',
}
const statusLabel: Record<ExtractionStatus, string> = {
  extracted: 'Extracted',
  'needs-review': 'Needs review',
  processing: 'Processing',
  failed: 'Failed',
}

type Filter = 'all' | 'needs-review' | 'failed'
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-review', label: 'Needs review' },
  { id: 'failed', label: 'Failed' },
]

const LOW_CONFIDENCE = 0.8

function DocumentPreview({ doc, highlight }: { doc: MockDocument; highlight: number | null }) {
  if (doc.status === 'processing') {
    return (
      <div className="mx-auto w-full max-w-xl space-y-3 rounded-lg border bg-card p-8 shadow-widget" aria-busy>
        <p className="text-sm text-muted-foreground">Extracting fields from {doc.pages} pages…</p>
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className={cn('h-3', i % 3 === 0 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    )
  }
  if (doc.status === 'failed') {
    return null
  }
  return (
    <article aria-label={`Preview of ${doc.name}`} className="mx-auto w-full max-w-xl rounded-lg border bg-card p-8 font-sans shadow-widget">
      {doc.lines.map((line, i) => (
        <p
          key={i}
          className={cn(
            '-mx-2 rounded px-2 py-0.5 text-sm whitespace-pre-wrap',
            i === 0 && 'font-semibold',
            highlight === i && 'bg-warning-soft ring-1 ring-warning',
          )}
        >
          {line}
        </p>
      ))}
      <p className="mt-6 text-xs text-muted-foreground">
        Page 1 of {doc.pages} · rendered from mock content
      </p>
    </article>
  )
}

export function DocumentAiApp({ params }: AppProps) {
  const [docs, setDocs] = useState<MockDocument[]>(initialDocuments)
  const [selectedId, setSelectedId] = useState<string>(params.doc ?? initialDocuments[0].id)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeField, setActiveField] = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const [mobileDetail, setMobileDetail] = useState(Boolean(params.doc))

  useParamsChange(params, (p) => {
    if (p.doc) {
      setSelectedId(p.doc)
      setFilter('all')
      setMobileDetail(true)
    }
  })

  const visible = useMemo(() => docs.filter((d) => filter === 'all' || d.status === filter), [docs, filter])
  const doc = docs.find((d) => d.id === selectedId) ?? docs[0]
  const activeLine = doc.fields.find((f) => f.key === activeField)?.sourceLine ?? null
  const lowConfidence = doc.fields.filter((f) => f.confidence < LOW_CONFIDENCE).length

  const select = (id: string) => {
    setSelectedId(id)
    setActiveField(null)
    setMobileDetail(true)
  }

  const confirmFields = () => {
    setDocs((list) => list.map((d) => (d.id === doc.id ? { ...d, status: 'extracted', issue: undefined } : d)))
    toast.success(`Fields confirmed for ${doc.id}`, { description: 'Mock action — nothing was sent to a workflow.' })
  }

  const requestCopy = () => {
    setRequested((prev) => new Set(prev).add(doc.id))
    toast.success('Unlocked copy requested', { description: 'Mock action — no message was sent.' })
  }

  return (
    <div className="@container flex h-full min-h-0">
      {/* Inbox */}
      <aside
        aria-label="Document inbox"
        className={cn('w-full min-w-0 flex-col border-r bg-chrome @3xl:flex @3xl:w-72 @3xl:shrink-0', mobileDetail ? 'hidden' : 'flex')}
      >
        <div className="space-y-2 border-b px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-base font-semibold">Inbox</h3>
            <MockBadge className="ml-auto" />
          </div>
          <div role="group" aria-label="Filter documents" className="flex gap-1">
            {filters.map((f) => (
              <Button key={f.id} size="xs" variant={filter === f.id ? 'secondary' : 'ghost'} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Nothing here</EmptyTitle>
              <EmptyDescription>No documents have this status.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => setFilter('all')}>
              Show all documents
            </Button>
          </Empty>
        ) : (
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {visible.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  aria-current={d.id === doc.id ? 'true' : undefined}
                  onClick={() => select(d.id)}
                  className={cn(
                    'flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    d.id === doc.id ? 'bg-accent' : 'hover:bg-muted',
                  )}
                >
                  <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {d.docType} · <span className="tabular-nums">{d.receivedAt}</span>
                    </span>
                    <StatusBadge tone={statusTone[d.status]} className="mt-1.5">
                      {statusLabel[d.status]}
                    </StatusBadge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Preview + fields */}
      <div className={cn('min-w-0 flex-1 flex-col @3xl:flex', mobileDetail ? 'flex' : 'hidden')}>
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <Button variant="ghost" size="icon-sm" className="@3xl:hidden" aria-label="Back to inbox" onClick={() => setMobileDetail(false)}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{doc.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              <span className="tabular-nums">{doc.id}</span> · {doc.docType} · {doc.source}
              {doc.linkedTo && <> · linked to {doc.linkedTo}</>}
            </p>
          </div>
          <StatusBadge tone={statusTone[doc.status]}>{statusLabel[doc.status]}</StatusBadge>
        </header>

        <div className="flex min-h-0 flex-1 flex-col @4xl:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/60 p-6">
            {doc.status === 'failed' ? (
              <Empty className="rounded-lg border bg-card">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Lock />
                  </EmptyMedia>
                  <EmptyTitle>This document couldn't be read</EmptyTitle>
                  <EmptyDescription>{doc.issue}</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" disabled={requested.has(doc.id)} onClick={requestCopy}>
                  {requested.has(doc.id) ? 'Unlocked copy requested' : 'Request unlocked copy'}
                </Button>
              </Empty>
            ) : (
              <DocumentPreview doc={doc} highlight={activeLine} />
            )}
          </div>

          {(doc.status === 'extracted' || doc.status === 'needs-review') && (
            <aside aria-label="Extracted fields" className="flex max-h-[45%] w-full shrink-0 flex-col border-t @4xl:max-h-none @4xl:w-72 @4xl:border-t-0 @4xl:border-l">
              <div className="border-b px-4 py-3">
                <h4 className="text-sm font-semibold">Extracted fields</h4>
                <p className="text-xs text-muted-foreground">
                  {lowConfidence > 0 ? `${lowConfidence} below ${LOW_CONFIDENCE * 100}% confidence` : 'All fields above review threshold'}
                </p>
              </div>
              {doc.issue && (
                <p className="mx-4 mt-3 flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-ink">
                  <FileWarning aria-hidden className="size-4 shrink-0" />
                  {doc.issue}
                </p>
              )}
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                {doc.fields.map((f) => {
                  const low = f.confidence < LOW_CONFIDENCE
                  return (
                    <li key={f.key}>
                      <button
                        type="button"
                        aria-pressed={activeField === f.key}
                        onClick={() => setActiveField(activeField === f.key ? null : f.key)}
                        className={cn(
                          'w-full rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                          activeField === f.key ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          {f.label}
                          <span className={cn('tabular-nums', low && 'font-medium text-warning-ink')}>
                            {Math.round(f.confidence * 100)}%{low && ' · check'}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm font-medium tabular-nums">{f.value}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t p-3">
                {doc.status === 'extracted' ? (
                  <p className="px-1 text-sm text-muted-foreground">No review needed. Fields are ready for the workflow.</p>
                ) : (
                  <Button className="w-full" onClick={confirmFields}>
                    Confirm fields
                  </Button>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
