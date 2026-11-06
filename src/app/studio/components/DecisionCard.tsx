import { useState } from 'react'
import { ChevronDown, Database, Fingerprint, GitBranch, LayoutPanelTop, ListChecks, Puzzle, Unplug, UserCheck, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import type { GenerateTab } from '../stages/GenerateStage'
import type { FindingCategory, StageId, ValidationFinding } from '../types'
import { useStudio } from '../use-studio'

const categoryIcon: Record<FindingCategory, LucideIcon> = {
  requirements: ListChecks,
  capabilities: Puzzle,
  compatibility: Unplug,
  workflow: GitBranch,
  'data-contract': Database,
  security: Fingerprint,
  'ui-data': LayoutPanelTop,
  approvals: UserCheck,
}

/** One automatic check that needs the user: what is wrong, and the quickest way to settle it. */
export function DecisionCard({ finding, goTo, onAccept }: { finding: ValidationFinding; goTo: (stage: StageId, tab?: GenerateTab) => void; onAccept: (f: ValidationFinding) => void }) {
  const { dispatch } = useStudio()
  const [open, setOpen] = useState(false)
  const now = () => new Date().toISOString()
  const blocked = finding.status === 'blocked'
  const Icon = categoryIcon[finding.category]
  return (
    <li className="studio-card rounded-[22px] p-3.5">
      <div className="flex flex-wrap items-start gap-2.5">
        <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', blocked ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink')}>
          <Icon className="size-4" />
        </span>
        <h4 className="min-w-0 flex-1 basis-56 self-center text-[13px] leading-snug font-semibold">{finding.title}</h4>
        <StatusBadge tone={blocked ? 'danger' : 'warning'}>{blocked ? 'Required' : 'Your call'}</StatusBadge>
        <Button size="xs" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
          Details
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open && (
        <dl className="mt-3 grid gap-x-5 gap-y-2.5 rounded-2xl bg-white/70 p-3 text-[13px] leading-snug @3xl:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">What is wrong</dt>
            <dd>{finding.explanation}</dd>
          </div>
          {finding.impact && (
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">Why it matters</dt>
              <dd>{finding.impact}</dd>
            </div>
          )}
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">Where it occurs</dt>
            <dd>
              {stageMeta[finding.artifact.stage].label} → {finding.artifact.label}
            </dd>
          </div>
          {finding.resolution && (
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">Recommended resolution</dt>
              <dd>{finding.resolution}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-11">
        {finding.quickFix?.kind === 'assign-role' && (
          <NativeSelect
            size="sm"
            aria-label="Choose the approver role"
            defaultValue=""
            onChange={(e) => {
              const fix = finding.quickFix
              if (fix?.kind === 'assign-role' && e.target.value) {
                dispatch({ type: 'generate/patch', patch: { kind: 'assign-role', nodeId: fix.nodeId, role: e.target.value }, reason: `Resolving: ${finding.title}`, now: now() })
              }
            }}
          >
            <NativeSelectOption value="" disabled>
              Assign approver…
            </NativeSelectOption>
            {finding.quickFix.candidates.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        {finding.quickFix?.kind === 'add-field' && (
          <Button
            size="sm"
            className="rounded-full"
            onClick={() =>
              finding.quickFix?.kind === 'add-field' &&
              dispatch({
                type: 'generate/patch',
                patch: { kind: 'add-field', entityId: finding.quickFix.entityId, field: { id: finding.quickFix.fieldId, label: finding.quickFix.label, type: 'longtext' } },
                reason: `Resolving: ${finding.title}`,
                now: now(),
              })
            }
          >
            Add “{finding.quickFix.label}” field
          </Button>
        )}
        <Button size="sm" variant="outline" className="rounded-full bg-white/70" onClick={() => goTo(finding.artifact.stage, finding.artifact.tab as GenerateTab | undefined)}>
          Open {stageMeta[finding.artifact.stage].label}
        </Button>
        {finding.status === 'needs-review' && (
          <Button size="sm" variant="ghost" onClick={() => onAccept(finding)}>
            Accept as known gap
          </Button>
        )}
      </div>
    </li>
  )
}
