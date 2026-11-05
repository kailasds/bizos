import { useState } from 'react'
import { ArrowRight, ChevronDown, RefreshCw, ShieldCheck } from 'lucide-react'
import { validateBlueprint, validationCategories } from '@/app/blueprint/validate'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { stageMeta } from '../stageMeta'
import type { FindingStatus, StageId, ValidationFinding } from '../types'
import { useStudio } from '../use-studio'
import type { GenerateTab } from './GenerateStage'

const statusMeta: Record<FindingStatus, { tone: StatusTone; label: string }> = {
  passed: { tone: 'success', label: 'Passed' },
  'needs-review': { tone: 'warning', label: 'Needs review' },
  blocked: { tone: 'danger', label: 'Blocked' },
}

const rank: Record<FindingStatus, number> = { passed: 0, 'needs-review': 1, blocked: 2 }

function FindingRow({
  finding,
  acknowledged,
  goTo,
}: {
  finding: ValidationFinding
  acknowledged: boolean
  goTo: (stage: StageId, tab?: GenerateTab) => void
}) {
  const { dispatch } = useStudio()
  const [open, setOpen] = useState(finding.status !== 'passed')
  const status = acknowledged ? { tone: 'neutral' as const, label: 'Accepted' } : statusMeta[finding.status]
  const now = () => new Date().toISOString()

  return (
    <li className="border-b last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
      >
        <StatusBadge tone={status.tone} className="w-28 justify-center">
          {status.label}
        </StatusBadge>
        <span className="min-w-0 flex-1 font-medium">{finding.title}</span>
        <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted-foreground', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 pl-[8.75rem] text-sm max-sm:pl-4">
          <p>{finding.explanation}</p>
          <p className="text-xs text-muted-foreground">
            Related artifact: {stageMeta[finding.artifact.stage].label} → {finding.artifact.label}
          </p>
          {finding.resolution && finding.status !== 'passed' && (
            <p>
              <span className="font-medium">Suggested resolution: </span>
              {finding.resolution}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {finding.quickFix?.kind === 'assign-role' && (
              <NativeSelect
                size="sm"
                aria-label="Choose the approver role"
                defaultValue=""
                onChange={(e) => {
                  const fix = finding.quickFix
                  if (fix?.kind === 'assign-role' && e.target.value) {
                    dispatch({ type: 'generate/patch', patch: { kind: 'assign-role', nodeId: fix.nodeId, role: e.target.value }, now: now() })
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
                onClick={() =>
                  finding.quickFix?.kind === 'add-field' &&
                  dispatch({
                    type: 'generate/patch',
                    patch: { kind: 'add-field', entityId: finding.quickFix.entityId, field: { id: finding.quickFix.fieldId, label: finding.quickFix.label, type: 'longtext' } },
                    now: now(),
                  })
                }
              >
                Add “{finding.quickFix.label}” field
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => goTo(finding.artifact.stage, finding.artifact.tab as GenerateTab | undefined)}>
              Open {stageMeta[finding.artifact.stage].label}
            </Button>
            {finding.status === 'needs-review' && !acknowledged && (
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'validate/acknowledge', findingId: finding.id })}>
                Accept for this version
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export function ValidateStage({ goTo }: { goTo: (stage: StageId, tab?: GenerateTab) => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(450)

  if (!project?.blueprint || !project.composition) {
    return <StagePrerequisite stage="validate" requires="generate" message="Generate the Application Blueprint first. Validation checks the blueprint." />
  }

  const bp = project.blueprint
  const validation = project.validation
  const stale = validation && validation.blueprintVersion !== bp.version
  const run = () =>
    sim.run(validationCategories.length, () =>
      dispatch({ type: 'validate/result', findings: validateBlueprint(bp, project.composition!.mappings), now: new Date().toISOString() }),
    )

  const findings = validation?.findings ?? []
  const isAck = (f: ValidationFinding) => validation?.acknowledged.includes(f.id) ?? false
  const effective = (f: ValidationFinding): FindingStatus => (f.status === 'needs-review' && isAck(f) ? 'passed' : f.status)
  const counts = { blocked: findings.filter((f) => effective(f) === 'blocked').length, review: findings.filter((f) => effective(f) === 'needs-review').length }
  const passedCategories = validationCategories.filter((c) => findings.filter((f) => f.category === c.id).every((f) => effective(f) === 'passed')).length

  return (
    <StageFrame
      stage="validate"
      aside={validation && <span className="text-xs text-muted-foreground tabular-nums">Checked blueprint v{validation.blueprintVersion}</span>}
      footer={
        sim.running ? null : (
          <>
            {validation && (
              <Button variant="outline" onClick={run}>
                <RefreshCw />
                Re-run validation
              </Button>
            )}
            <Button disabled={project.progress.validate !== 'complete'} onClick={() => dispatch({ type: 'stage/go', stage: 'publish' })}>
              Continue to publish
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      {sim.running ? (
        <div className="rounded-xl border bg-card p-6" aria-busy>
          <p className="mb-4 text-sm font-medium">Validating blueprint v{bp.version}…</p>
          <StepList label="Validation checks" steps={validationCategories.map((c) => c.label)} current={sim.step} />
        </div>
      ) : !validation ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>Validation has not run yet</EmptyTitle>
            <EmptyDescription>
              Eight checks compare the blueprint’s requirements, resources, workflow, data, permissions, screens and approvals. Publishing is blocked until they pass.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={run}>Run validation</Button>
        </Empty>
      ) : (
        <div className="space-y-4">
          {stale && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-info/30 bg-info-soft/60 px-4 py-2.5 text-sm">
              <span className="flex-1">
                The blueprint changed to v{bp.version} since this run. Re-run validation to confirm your changes.
              </span>
              <Button size="sm" onClick={run}>
                Re-run validation
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium tabular-nums">
              {passedCategories} of {validationCategories.length} checks passed
            </span>
            {counts.blocked > 0 && <StatusBadge tone="danger">{counts.blocked} blocked</StatusBadge>}
            {counts.review > 0 && <StatusBadge tone="warning">{counts.review} to review</StatusBadge>}
            {!counts.blocked && !counts.review && !stale && <StatusBadge tone="success">Ready to publish</StatusBadge>}
          </div>
          {validationCategories.map((cat) => {
            const list = findings.filter((f) => f.category === cat.id).sort((a, b) => rank[effective(b)] - rank[effective(a)])
            return (
              <section key={cat.id} aria-label={cat.label} className="overflow-hidden rounded-lg border bg-card">
                <h3 className="border-b bg-chrome px-4 py-2 text-xs font-medium text-muted-foreground">{cat.label}</h3>
                <ul>
                  {list.map((f) => (
                    <FindingRow key={f.id} finding={f} acknowledged={isAck(f)} goTo={goTo} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </StageFrame>
  )
}
