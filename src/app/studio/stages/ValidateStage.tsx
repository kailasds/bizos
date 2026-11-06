import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, ChevronDown, CircleAlert, CircleDashed, Database, Fingerprint, GitBranch, LayoutPanelTop, ListChecks, Puzzle, RefreshCw, ShieldCheck, Unplug, UserCheck, XCircle, type LucideIcon } from 'lucide-react'
import { validateBlueprint, validationCategories } from '@/app/blueprint/validate'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { InfoTip } from '@/components/os/InfoTip'
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
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { ctaClass } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import { stageMeta } from '../stageMeta'
import type { FindingCategory, StageId, ValidationFinding } from '../types'
import { useStudio } from '../use-studio'
import type { GenerateTab } from './GenerateStage'

const categoryLabel = Object.fromEntries(validationCategories.map((c) => [c.id, c.label])) as Record<string, string>
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

type CheckState = 'idle' | 'running' | 'passed' | 'review' | 'blocked' | 'accepted'

const checkStyle: Record<CheckState, { tile: string; ring: string; color: string }> = {
  idle: { tile: 'bg-white/60 text-muted-foreground', ring: '', color: 'oklch(0.3 0.03 285 / 0.1)' },
  running: { tile: 'bg-accent text-primary', ring: 'ring-2 ring-primary', color: 'var(--primary)' },
  passed: { tile: 'bg-success-soft text-success-ink', ring: '', color: 'var(--success)' },
  accepted: { tile: 'bg-info-soft text-info-ink', ring: '', color: 'var(--info)' },
  review: { tile: 'bg-warning-soft text-warning-ink', ring: 'ring-1 ring-warning', color: 'var(--warning)' },
  blocked: { tile: 'bg-danger-soft text-danger-ink', ring: 'ring-1 ring-danger', color: 'var(--danger)' },
}

/** Eight checks around one shield. Each arc is a check, not a score. */
function ShieldGauge({ states, passed }: { states: CheckState[]; passed: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const gap = 5
  const len = c / states.length - gap
  return (
    <span className="relative flex size-44 shrink-0 items-center justify-center" role="img" aria-label={`${passed} of ${states.length} checks passed`}>
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90" aria-hidden>
        {states.map((s, i) => (
          <motion.circle key={i} cx="80" cy="80" r={r} fill="none" stroke={checkStyle[s].color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-i * (len + gap)} initial={false} animate={{ stroke: checkStyle[s].color }} />
        ))}
      </svg>
      <span className="flex flex-col items-center">
        <ShieldCheck aria-hidden className="mb-0.5 size-6 text-studio-ink" />
        <span className="text-2xl leading-none font-bold tabular-nums">
          {passed}/{states.length}
        </span>
      </span>
    </span>
  )
}

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
  const Icon = categoryIcon[finding.category]
  return (
    <li id={`issue-${finding.category}`} className={cn('studio-card scroll-mt-20 rounded-[22px] p-3.5', finding.status === 'blocked' && !accepted && 'border-danger/40')}>
      <div className="flex flex-wrap items-start gap-2.5">
        <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', accepted ? checkStyle.accepted.tile : finding.status === 'blocked' ? checkStyle.blocked.tile : checkStyle.review.tile)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[11px] text-muted-foreground">{categoryLabel[finding.category]}</p>
          <h4 className="text-[13px] leading-snug font-semibold">{finding.title}</h4>
        </div>
        {finding.approvalRequired && !accepted && <UserCheck aria-label="Your decision needed" className="mt-0.5 size-4 text-muted-foreground" />}
        <StatusBadge tone={tone}>{label}</StatusBadge>
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
      {!accepted && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-11">
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
              className="rounded-full"
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
          <Button size="sm" variant="outline" className="rounded-full bg-white/70" onClick={() => goTo(finding.artifact.stage, finding.artifact.tab as GenerateTab | undefined)}>
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

  if (!project?.blueprint || !project.composition) {
    return <StagePrerequisite stage="validate" requires="generate" message="Generate the blueprint first. Validation checks it." />
  }

  const bp = project.blueprint
  const validation = project.validation
  const readiness = readinessOf(project)
  const run = () => sim.run(validationCategories.length, () => dispatch({ type: 'validate/result', findings: validateBlueprint(bp, project.composition!.mappings), now: new Date().toISOString() }))

  const findings = validation?.findings ?? []
  const isAck = (f: ValidationFinding) => validation?.acknowledged.includes(f.id) ?? false
  const issues = findings.filter((f) => f.status !== 'passed').sort((a, b) => Number(isAck(a)) - Number(isAck(b)) || (a.status === 'blocked' ? -1 : 1) - (b.status === 'blocked' ? -1 : 1))
  const passed = findings.filter((f) => f.status === 'passed')
  const passedCategories = validationCategories.filter((c) => findings.filter((f) => f.category === c.id).every((f) => f.status === 'passed' || isAck(f))).length

  const stateOf = (category: FindingCategory, i: number): CheckState => {
    if (sim.running) return i < sim.step ? 'passed' : i === sim.step ? 'running' : 'idle'
    if (!validation) return 'idle'
    const inCategory = findings.filter((f) => f.category === category)
    if (inCategory.some((f) => f.status === 'blocked' && !isAck(f))) return 'blocked'
    if (inCategory.some((f) => f.status === 'needs-review' && !isAck(f))) return 'review'
    if (inCategory.some((f) => f.status !== 'passed')) return 'accepted'
    return 'passed'
  }
  const states = validationCategories.map((c, i) => stateOf(c.id as FindingCategory, i))

  return (
    <StageFrame
      stage="validate"
      aside={validation && <span className="text-xs text-muted-foreground tabular-nums">Checked blueprint v{validation.blueprintVersion}</span>}
      footer={
        sim.running ? (
          <span className="flex items-center gap-2 pr-3 py-1.5 font-medium">
            <Spinner className="size-4 text-primary" />
            Validating blueprint v{bp.version}…
          </span>
        ) : validation ? (
          <>
            <Button variant="outline" className="rounded-full bg-white/70" onClick={run}>
              <RefreshCw />
              Re-run validation
            </Button>
            <Button className={ctaClass} disabled={project.progress.validate !== 'complete'} onClick={() => dispatch({ type: 'stage/go', stage: 'publish' })}>
              Continue to publish
              <ArrowRight />
            </Button>
          </>
        ) : (
          <Button className={ctaClass} onClick={run}>
            <ShieldCheck />
            Run validation
          </Button>
        )
      }
    >
      <section aria-label="Readiness" className="studio-card flex flex-wrap items-center gap-5 rounded-[28px] p-5">
        <ShieldGauge states={states} passed={sim.running ? sim.step : validation ? passedCategories : 0} />
        <div className="min-w-0 flex-1 basis-96 space-y-3">
          {validation && !sim.running && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={readinessMeta[readiness].tone}>{readinessMeta[readiness].label}</StatusBadge>
              <span className="text-sm font-semibold tabular-nums">
                {passedCategories} of {validationCategories.length} checks passed
              </span>
              {readiness !== 'outdated' && <InfoTip label="About readiness">{readinessMeta[readiness].description}</InfoTip>}
              {readiness === 'outdated' && (
                <span className="flex items-center gap-1.5 text-[13px] text-warning-ink">
                  <CircleAlert aria-hidden className="size-3.5" />
                  Blueprint changed to v{bp.version} since this run.
                </span>
              )}
            </div>
          )}
          {!validation && !sim.running && <p className="text-sm font-semibold">Eight checks stand between this blueprint and the desktop.</p>}
          <ul aria-label="Validation checks" aria-live="polite" className="grid grid-cols-2 gap-1.5 @5xl:grid-cols-4">
            {validationCategories.map((c, i) => {
              const state = states[i]
              const Icon = categoryIcon[c.id as FindingCategory]
              const hasIssue = state === 'blocked' || state === 'review' || state === 'accepted'
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!hasIssue}
                    onClick={() => document.getElementById(`issue-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className={cn('flex h-full w-full items-center gap-2 rounded-2xl p-2 text-left text-xs leading-tight font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default', checkStyle[state].tile, checkStyle[state].ring)}
                  >
                    {state === 'running' ? <Spinner className="size-4 shrink-0" /> : <Icon aria-hidden className="size-4 shrink-0" />}
                    <span className="min-w-0 flex-1">{c.label}</span>
                    {state === 'passed' && <Check aria-label="Passed" className="size-3.5 shrink-0" />}
                    {state === 'blocked' && <XCircle aria-label="Blocked" className="size-3.5 shrink-0" />}
                    {state === 'review' && <CircleAlert aria-label="Needs attention" className="size-3.5 shrink-0" />}
                    {state === 'idle' && <CircleDashed aria-label="Not run" className="size-3.5 shrink-0 opacity-50" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {validation && !sim.running && (
        <div className="mt-4 space-y-3">
          {issues.length > 0 && (
            <ul aria-label="Validation issues" className="space-y-2.5">
              {issues.map((f) => (
                <IssueCard key={f.id} finding={f} accepted={isAck(f)} goTo={goTo} onAccept={setAccepting} />
              ))}
            </ul>
          )}

          <section aria-label="Passed checks">
            <button type="button" aria-expanded={showPassed} onClick={() => setShowPassed(!showPassed)} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium outline-none hover:bg-white/60 focus-visible:ring-3 focus-visible:ring-ring/50">
              <CheckCircle2 aria-hidden className="size-4 text-success" />
              {passed.length} check{passed.length === 1 ? '' : 's'} passed
              <ChevronDown aria-hidden className={cn('size-4 text-muted-foreground transition-transform', showPassed && 'rotate-180')} />
            </button>
            {showPassed && (
              <ul className="mt-2 grid gap-2 @4xl:grid-cols-2">
                {passed.map((f) => (
                  <li key={f.id} title={f.explanation} className="flex items-start gap-2 rounded-2xl bg-white/60 p-2.5 text-[13px] leading-snug">
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {f.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <AlertDialog open={Boolean(accepting)} onOpenChange={(o) => !o && setAccepting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept as a known gap?</AlertDialogTitle>
            <AlertDialogDescription>
              “{accepting?.title}” stays unresolved in v{bp.version}. {accepting?.impact} Your acceptance is recorded in this draft’s decision log and applies to this version only.
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
