import { StatusBadge } from '@/components/os/StatusBadge'
import type { Execution, Outcome } from '../types'
import { formatDateTime, useRuntimeLinks } from './meta'

/** The business result of a completed execution, with the evidence and any human decision behind it. */
export function OutcomeView({ outcome, execution }: { outcome: Outcome; execution: Execution }) {
  const links = useRuntimeLinks()
  return (
    <section aria-label={`Business outcome: ${outcome.label}`} className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold">{outcome.label}</h4>
        <StatusBadge tone={outcome.tone}>{outcome.tone === 'success' ? 'Completed' : 'Completed — declined'}</StatusBadge>
        <span className="ml-auto text-xs text-muted-foreground">
          {outcome.id} · {formatDateTime(outcome.completedAt)}
        </span>
      </header>
      <dl className="grid gap-3 text-sm @xl:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Why this outcome</dt>
          <dd>{outcome.reason}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Human intervention</dt>
          <dd>{outcome.humanIntervention ?? 'None — decided by the workflow rules.'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Transaction</dt>
          <dd>
            {execution.transaction.id} · {execution.transaction.label}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Execution</dt>
          <dd>
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openExecution(execution.id)}>
              {execution.id}
            </button>{' '}
            on {execution.appName} v{execution.blueprintVersion}
          </dd>
        </div>
      </dl>
      {outcome.evidence.length > 0 && (
        <div>
          <h5 className="text-xs text-muted-foreground">Supporting evidence</h5>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {outcome.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Simulated outcome. Not a real claims, clinical or credit decision.</p>
    </section>
  )
}
