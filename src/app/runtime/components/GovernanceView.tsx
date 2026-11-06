import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RuntimeApp } from '../types'
import { approvalRules, governancePolicies, rejectionHandling } from '../workflow-config'

/** Approval requirements, sensitive steps, policies and audit requirements for one application. */
export function GovernanceView({ app }: { app: RuntimeApp }) {
  const [open, setOpen] = useState(false)
  const rules = approvalRules.filter((r) => r.domain === app.domain)
  const bp = app.blueprint
  const human = bp.workflow.nodes.filter((n) => n.actor === 'human')
  const decisions = bp.workflow.nodes.filter((n) => n.actor !== 'human' && /decision|routing/.test(n.capabilityId))
  const roleName = (id: string | null) => bp.security.roles.find((r) => r.id === id)?.name ?? 'Approver to be decided'
  return (
    <div className="space-y-4">
      <section aria-label="Applicable policies" className="space-y-2">
        <h4 className="text-sm font-semibold">Policies</h4>
        <ul className="divide-y rounded-lg border bg-card">
          {governancePolicies[app.domain].map((p) => (
            <li key={p.id} className="flex gap-3 px-3 py-2 text-sm">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{p.title}</span>
                <span className="block text-muted-foreground">{p.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-4 @2xl:grid-cols-2">
        <section aria-label="Approval requirements" className="space-y-2">
          <h4 className="text-sm font-semibold">When a person must approve</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {rules.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.type}:</span> {r.condition}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{rejectionHandling[app.domain]}</p>
        </section>
        <section aria-label="Sensitive workflow steps" className="space-y-2">
          <h4 className="text-sm font-semibold">Sensitive steps</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {human.map((n) => (
              <li key={n.id}>
                {n.name} — decided by {roleName(n.role)}
              </li>
            ))}
            {decisions.map((n) => (
              <li key={n.id}>{n.name} — automated decision within rules</li>
            ))}
          </ul>
          <h4 className="pt-2 text-sm font-semibold">Audit requirements</h4>
          <p className="text-sm">
            {bp.security.audit.decisionLog ? 'Every decision is logged with its reviewer and reason' : 'Decision log not enabled'}; retention {bp.security.audit.retention}. Audit records are append-only.
          </p>
        </section>
      </div>
      <div className="rounded-lg border bg-card">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          Detailed policy configuration
          <ChevronDown aria-hidden className={cn('size-4', open && 'rotate-180')} />
        </button>
        {open && (
          <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t px-3 py-2 text-xs">
            {rules.map((r) => (
              <div key={r.id} className="contents">
                <dt className="font-mono text-muted-foreground">{r.id}</dt>
                <dd>
                  {r.condition} Priority: {r.priority}.
                </dd>
              </div>
            ))}
            {governancePolicies[app.domain].map((p) => (
              <div key={p.id} className="contents">
                <dt className="font-mono text-muted-foreground">{p.id}</dt>
                <dd>{p.detail}</dd>
              </div>
            ))}
            {bp.security.approvals.map((a) => (
              <div key={a.id} className="contents">
                <dt className="font-mono text-muted-foreground">{a.id}</dt>
                <dd>
                  Blueprint approval rule: {a.description} ({roleName(a.role)})
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
