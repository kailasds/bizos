import { useMemo, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { Approval, ApprovalStatus, RuntimeState } from '../types'
import { approvalStatusMeta, formatDateTime } from './meta'

type Category = 'pending' | 'approved' | 'rejected' | 'other'
const inCategory = (s: ApprovalStatus, c: Category) =>
  c === 'pending' ? s === 'pending' || s === 'info-requested' : c === 'other' ? s === 'withdrawn' : s === c

const categories: { id: Category; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'other', label: 'Withdrawn' },
]

/** Human approvals across every application. */
export function ApprovalQueue({ approvals, state, onOpen }: { approvals: Approval[]; state: RuntimeState; onOpen: (id: string) => void }) {
  const [category, setCategory] = useState<Category>('pending')
  const rows = useMemo(
    () =>
      approvals
        .filter((a) => inCategory(a.status, category))
        .sort((a, b) => (a.priority === b.priority ? b.submittedAt.localeCompare(a.submittedAt) : a.priority === 'high' ? -1 : 1)),
    [approvals, category],
  )
  const appName = (id: string) => state.executions.find((e) => e.appId === id)?.appName ?? id

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Approval status" className="flex flex-wrap gap-1">
        {categories.map((c) => (
          <Button key={c.id} size="xs" variant={category === c.id ? 'secondary' : 'ghost'} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label} <span className="text-muted-foreground tabular-nums">{approvals.filter((a) => inCategory(a.status, c.id)).length}</span>
          </Button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck />
            </EmptyMedia>
            <EmptyTitle>{category === 'pending' ? 'Nothing waiting for a decision' : `No ${categories.find((c) => c.id === category)!.label.toLowerCase()} approvals`}</EmptyTitle>
            <EmptyDescription>Approvals appear when a running execution meets one of its workflow’s approval rules.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul aria-label="Approvals" className="divide-y rounded-lg border bg-card">
          {rows.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen(a.id)}
                aria-label={`${a.id} ${a.type} — ${approvalStatusMeta[a.status].label}`}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block text-sm font-medium">
                    {a.type} <span className="font-normal text-muted-foreground">· {a.transactionId}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.id} · {appName(a.appId)} · {a.reviewer} · {formatDateTime(a.submittedAt)}
                  </span>
                </span>
                {a.priority === 'high' && <span className="text-xs font-medium text-warning-ink">High priority</span>}
                <StatusBadge tone={approvalStatusMeta[a.status].tone}>{approvalStatusMeta[a.status].label}</StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
