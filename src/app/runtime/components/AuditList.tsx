import { useState } from 'react'
import { ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditEvent } from '../types'
import { auditCategoryLabel, formatDateTime, useRuntimeLinks } from './meta'

/**
 * Append-only audit records. Rows expand to show every field; there are deliberately no
 * edit or delete controls — audit entries are immutable in the prototype.
 */
export function AuditList({ events, appName, label = 'Audit trail', showExecution = true }: { events: AuditEvent[]; appName?: (appId: string) => string; label?: string; showExecution?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const links = useRuntimeLinks()
  return (
    <ol aria-label={label} className="divide-y rounded-lg border bg-card">
      {events.map((e) => {
        const expanded = open === e.id
        return (
          <li key={e.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : e.id)}
              className="flex w-full items-start gap-3 px-3 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{e.action}</span>
                <span className="line-clamp-1 block text-xs text-muted-foreground">
                  {e.actor} · {auditCategoryLabel[e.category]}
                  {showExecution && e.executionId ? ` · ${e.executionId}` : ''}
                  {appName ? ` · ${appName(e.appId)}` : ''}
                </span>
              </span>
              <ChevronRight aria-hidden className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground', expanded && 'rotate-90')} />
            </button>
            {expanded && (
              <div className="space-y-2 border-t bg-muted/30 px-3 py-2 text-sm">
                <p>{e.description}</p>
                <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Event ID</dt>
                  <dd className="tabular-nums">{e.id}</dd>
                  <dt className="text-muted-foreground">Timestamp</dt>
                  <dd>{new Date(e.at).toLocaleString('en-GB')}</dd>
                  <dt className="text-muted-foreground">Actor</dt>
                  <dd>
                    {e.actor} ({e.actorType})
                  </dd>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{auditCategoryLabel[e.category]}</dd>
                  {e.previousState && (
                    <>
                      <dt className="text-muted-foreground">State change</dt>
                      <dd>
                        {e.previousState} → {e.newState}
                      </dd>
                    </>
                  )}
                  {!e.previousState && e.newState && (
                    <>
                      <dt className="text-muted-foreground">New state</dt>
                      <dd>{e.newState}</dd>
                    </>
                  )}
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  {e.executionId && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => links.openExecution(e.executionId!)}>
                      Execution {e.executionId}
                    </button>
                  )}
                  {e.approvalId && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => links.openApproval(e.approvalId!)}>
                      Approval {e.approvalId}
                    </button>
                  )}
                  {e.resourceId && !e.resourceId.startsWith('role:') && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => links.openResource(e.resourceId!)}>
                      Resource {e.resourceId}
                    </button>
                  )}
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => links.openApplication(e.appId)}>
                    Application
                  </button>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock aria-hidden className="size-3" /> Audit records cannot be edited or deleted.
                </p>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
