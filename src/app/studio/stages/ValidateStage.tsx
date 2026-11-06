import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, MonitorPlay, RefreshCw, UserCheck } from 'lucide-react'
import { ExperienceRenderer } from '@/app/experience/ExperienceRenderer'
import { Spinner } from '@/components/ui/spinner'
import { getScenario } from '@/data/studio-scenarios.mock'
import { validateBlueprint, validationCategories } from '@/app/blueprint/validate'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { stageMeta } from '../stageMeta'
import type { StageId, ValidationFinding } from '../types'
import { useStudio } from '../use-studio'
import type { GenerateTab } from './GenerateStage'

const categoryLabel = Object.fromEntries(validationCategories.map((c) => [c.id, c.label])) as Record<string, string>

function IssueCard({
  finding,
  accepted,
  goTo,
  onAccept,
}: {
  finding: ValidationFinding
  accepted: boolean
  goTo: (stage: StageId, tab?: GenerateTab) => void
  onAccept: (f: ValidationFinding) => void
}) {
  const { dispatch } = useStudio()
  const [open, setOpen] = useState(false)
  const now = () => new Date().toISOString()
  const tone: StatusTone = accepted ? 'info' : finding.status === 'blocked' ? 'danger' : 'warning'
  const label = accepted ? 'Accepted as known gap' : finding.status === 'blocked' ? 'Blocked' : 'Needs attention'
  return (
    <li className={cn('rounded-lg border bg-card', finding.status === 'blocked' && !accepted && 'border-danger/30')}>
      <div className="flex flex-wrap items-start gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{categoryLabel[finding.category]}</p>
          <h4 className="text-sm font-semibold">{finding.title}</h4>
        </div>
        {finding.approvalRequired && !accepted && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 text-xs leading-5 text-muted-foreground">
            <UserCheck aria-hidden className="size-3" /> Your decision needed
          </span>
        )}
        <StatusBadge tone={tone}>{label}</StatusBadge>
        <Button size="xs" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
          Details
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open && (
      <dl className="grid gap-x-6 gap-y-3 border-b px-4 py-3 text-sm @3xl:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">What is wrong</dt>
          <dd>{finding.explanation}</dd>
        </div>
        {finding.impact && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Why it matters</dt>
            <dd>{finding.impact}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Where it occurs</dt>
          <dd>
            {stageMeta[finding.artifact.stage].label} → {finding.artifact.label}
          </dd>
        </div>
        {finding.resolution && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Recommended resolution</dt>
            <dd>{finding.resolution}</dd>
          </div>
        )}
      </dl>
      )}
      {!accepted && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {finding.quickFix?.kind === 'assign-role' && (
            <NativeSelect
              size="sm"
              aria-label="Choose the approver role"
              defaultValue=""
              onChange={(e) => {
                const fix = finding.quickFix
                if (fix?.kind === 'assign-role' && e.target.value) {
                  dispatch({ type: 'generate/patch', patch: { kind: 'assign-role', nodeId: fix.nodeId, role: e.target.value }, reason: `Resolving validation: ${finding.title}`, now: now() })
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
                  reason: `Resolving validation: ${finding.title}`,
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
          {finding.status === 'needs-review' && (
            <Button size="sm" variant="ghost" onClick={() => onAccept(finding)}>
              Accept as known gap
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

export function ValidateStage({ goTo }: { goTo: (stage: StageId, tab?: GenerateTab) => void }) {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(450)
  const [showPassed, setShowPassed] = useState(false)
  const [accepting, setAccepting] = useState<ValidationFinding | null>(null)
  const bpVersion = project?.blueprint?.version
  const checkedVersion = project?.validation?.blueprintVersion

  // Readiness checks run automatically whenever this version has not been checked yet.
  useEffect(() => {
    if (!project?.blueprint || !project.composition || sim.running || checkedVersion === bpVersion) return
    const blueprint = project.blueprint
    const mappings = project.composition.mappings
    sim.run(validationCategories.length, () => dispatch({ type: 'validate/result', findings: validateBlueprint(blueprint, mappings), now: new Date().toISOString() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpVersion, checkedVersion])

  if (!project?.blueprint || !project.composition) {
    return <StagePrerequisite stage="validate" requires="generate" message="Generate the Application Blueprint first to preview the application." />
  }

  const bp = project.blueprint
  const validation = project.validation
  const readiness = readinessOf(project)
  const run = () =>
    sim.run(validationCategories.length, () =>
      dispatch({ type: 'validate/result', findings: validateBlueprint(bp, project.composition!.mappings), now: new Date().toISOString() }),
    )

  const findings = validation?.findings ?? []
  const isAck = (f: ValidationFinding) => validation?.acknowledged.includes(f.id) ?? false
  const issues = findings
    .filter((f) => f.status !== 'passed')
    .sort((a, b) => Number(isAck(a)) - Number(isAck(b)) || (a.status === 'blocked' ? -1 : 1) - (b.status === 'blocked' ? -1 : 1))
  const passed = findings.filter((f) => f.status === 'passed')
  const passedCategories = validationCategories.filter((c) => findings.filter((f) => f.category === c.id).every((f) => f.status === 'passed' || isAck(f))).length

  const scenario = getScenario(project.scenarioId)
  const open = issues.filter((f) => !isAck(f))
  const accepted = issues.filter((f) => isAck(f))

  return (
    <StageFrame
      stage="validate"
      aside={
        validation && !sim.running ? (
          <section aria-label="Readiness" className="flex items-center gap-2">
            <StatusBadge tone={readinessMeta[readiness].tone}>{readinessMeta[readiness].label}</StatusBadge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {passedCategories} of {validationCategories.length} checks passed
            </span>
          </section>
        ) : undefined
      }
      footer={
        sim.running ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Checking v{bp.version}…
          </span>
        ) : (
          <>
            <Button variant="outline" onClick={run}>
              <RefreshCw />
              Re-run checks
            </Button>
            <Button disabled={project.progress.validate !== 'complete'} onClick={() => dispatch({ type: 'stage/go', stage: 'publish' })}>
              Continue to publish
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {sim.running && (
          <div className="rounded-2xl border bg-card p-4" aria-busy>
            <StepList label="Validation checks" steps={validationCategories.map((c) => c.label)} current={sim.step} />
          </div>
        )}

        {!sim.running && validation && open.length > 0 && (
          <section aria-label="Issues" className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <UserCheck aria-hidden className="size-4 text-primary" />
              Needs your decision · {open.length}
            </h3>
            <ul aria-label="Validation issues" className="space-y-3">
              {open.map((f) => (
                <IssueCard key={f.id} finding={f} accepted={false} goTo={goTo} onAccept={setAccepting} />
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Application preview" className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MonitorPlay aria-hidden className="size-4 text-primary" />
            {bp.name} · v{bp.version}
          </h3>
          <div className="h-[36rem] overflow-hidden rounded-2xl border bg-card shadow-widget">
            <ExperienceRenderer key={bp.version} blueprint={bp} initialRecords={scenario?.sampleRecords ?? []} />
          </div>
        </section>

        {!sim.running && validation && (
          <section aria-label="Passed checks" className="rounded-2xl border bg-card">
            <button
              type="button"
              aria-expanded={showPassed}
              onClick={() => setShowPassed(!showPassed)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
            >
              <CheckCircle2 aria-hidden className="size-4 text-success" />
              <span className="flex-1 font-medium">
                {passed.length} check{passed.length === 1 ? '' : 's'} passed{accepted.length ? ` · ${accepted.length} accepted as known gap${accepted.length === 1 ? '' : 's'}` : ''}
              </span>
              <ChevronDown aria-hidden className={cn('size-4 text-muted-foreground', showPassed && 'rotate-180')} />
            </button>
            {showPassed && (
              <ul className="divide-y border-t">
                {accepted.map((f) => (
                  <IssueCard key={f.id} finding={f} accepted goTo={goTo} onAccept={setAccepting} />
                ))}
                {passed.map((f) => (
                  <li key={f.id} className="px-4 py-2.5 text-sm">
                    <p className="font-medium">{f.title}</p>
                    <p className="text-muted-foreground">{f.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <AlertDialog open={Boolean(accepting)} onOpenChange={(o) => !o && setAccepting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept as a known gap?</AlertDialogTitle>
            <AlertDialogDescription>
              “{accepting?.title}” stays unresolved in v{bp.version}. {accepting?.impact} Your acceptance is recorded in this draft’s decision log and applies to
              this version only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (accepting) dispatch({ type: 'validate/acknowledge', findingId: accepting.id, now: new Date().toISOString() })
                setAccepting(null)
              }}
            >
              Accept known gap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StageFrame>
  )
}
