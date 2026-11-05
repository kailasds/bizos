import type { ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, CircleDot, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMockServices } from '@/app/services/use-mock-services'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { claimStageLabel, formatCurrency, type Claim, type StepStatus } from '@/data/claims.mock'
import { cn } from '@/lib/utils'
import { riskLabel, riskTone, stageTone } from './claimStatus'

const stepIcon: Record<StepStatus, { icon: typeof Circle; className: string; label: string }> = {
  done: { icon: CheckCircle2, className: 'text-success', label: 'Done' },
  active: { icon: CircleDot, className: 'text-primary', label: 'In progress' },
  pending: { icon: Circle, className: 'text-muted-foreground/50', label: 'Not started' },
  flagged: { icon: AlertTriangle, className: 'text-warning', label: 'Flagged' },
}

const docTone = { verified: 'success', 'needs-review': 'warning', missing: 'danger' } as const
const docLabel = { verified: 'Verified', 'needs-review': 'Needs review', missing: 'Missing' } as const

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm tabular-nums">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h4>
      {children}
    </section>
  )
}

export function ClaimDetail({ claim, onClose }: { claim: Claim; onClose: () => void }) {
  const { decideClaim } = useMockServices()
  const awaiting = claim.stage === 'awaiting-approval'

  const decide = (decision: 'approved' | 'referred') => {
    decideClaim(claim.id, decision)
    toast.success(decision === 'approved' ? `${claim.id} approved` : `${claim.id} referred`, {
      description: 'Mock decision recorded for this session only.',
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon-sm" className="@5xl:hidden" aria-label="Back to list" onClick={onClose}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground tabular-nums">{claim.id}</p>
          <h3 className="truncate text-base font-semibold">{claim.claimant}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge tone={stageTone[claim.stage]}>{claimStageLabel[claim.stage]}</StatusBadge>
            <StatusBadge tone={riskTone[claim.risk]}>{riskLabel[claim.risk]}</StatusBadge>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="hidden @5xl:inline-flex" aria-label="Close details" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {awaiting && claim.recommendation && (
          <section className="rounded-lg border border-warning/40 bg-warning-soft/60 p-3">
            <p className="text-xs font-medium text-warning-ink">Your decision is required</p>
            <p className="mt-1 text-sm">
              Recommendation:{' '}
              <span className="font-semibold">
                {claim.recommendation.decision === 'approve'
                  ? `Approve ${formatCurrency(claim.recommendation.amount)}`
                  : 'Refer to senior claims manager'}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{claim.recommendation.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => decide('approved')}>
                Approve settlement
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide('referred')}>
                Refer
              </Button>
            </div>
          </section>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Policy" value={claim.policyNumber} />
          <Fact label="Product" value={claim.product} />
          <Fact label="Loss" value={claim.lossType} />
          <Fact label="Claimed" value={formatCurrency(claim.amount)} />
          <Fact label="Loss date" value={claim.lossDate} />
          <Fact label="Reported" value={claim.reportedAt} />
          <Fact label="Handler" value={claim.handler} />
          <Fact label="SLA" value={claim.slaHoursRemaining > 0 ? `${claim.slaHoursRemaining} h remaining` : 'Closed'} />
        </dl>

        <Section title="Summary">
          <p className="text-sm">{claim.summary}</p>
        </Section>

        {claim.riskSignals.length > 0 && (
          <Section title="Risk signals">
            <ul className="space-y-1.5">
              {claim.riskSignals.map((signal) => (
                <li key={signal} className="flex gap-2 text-sm">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                  {signal}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Workflow">
          <ol className="space-y-0">
            {claim.steps.map((step, i) => {
              const meta = stepIcon[step.status]
              const Icon = meta.icon
              return (
                <li key={step.step} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < claim.steps.length - 1 && (
                    <span aria-hidden className="absolute top-5 bottom-0 left-2 w-px bg-border" />
                  )}
                  <Icon aria-label={meta.label} className={cn('relative size-4 shrink-0 bg-card', meta.className)} />
                  <div className="-mt-0.5 min-w-0">
                    <p className={cn('text-sm', step.status === 'pending' && 'text-muted-foreground')}>{step.step}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.actor}
                      {step.at && <span className="tabular-nums"> · {step.at}</span>}
                    </p>
                    {step.note && <p className="mt-0.5 text-xs">{step.note}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </Section>

        <Section title="Documents">
          <ul className="divide-y rounded-lg border">
            {claim.documents.map((doc) => (
              <li key={doc.name} className="flex items-center gap-2 px-3 py-2">
                <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.kind}</p>
                </div>
                <StatusBadge tone={docTone[doc.status]}>{docLabel[doc.status]}</StatusBadge>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}
