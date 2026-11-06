import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Circle, Eye, Lightbulb, ListTree } from 'lucide-react'
import { bumpVersion } from '@/app/blueprint/generate'
import { useOs } from '@/app/os/use-os'
import { findApp, getGeneratedApp } from '@/app/registry/applicationRegistry'
import type { AppProps } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { useOperationsLinks } from '@/app/runtime/components/links'
import { formatDateTime, proposalStatusMeta, RuntimeLinksContext, signalTypeLabel } from '@/app/runtime/components/meta'
import { getRuntimeApp } from '@/app/runtime/runtime-apps'
import { acceptBuiltinProposal, decideProposal, publishBuiltinDraft, recordStudioProposalAccepted, useRuntime, validateBuiltinDraft } from '@/app/runtime/store'
import type { ImprovementProposal, RuntimeState } from '@/app/runtime/types'
import { sectionLabel } from '@/app/services/mock/blueprint-service'
import { BlueprintDiff } from '@/app/studio/components/BlueprintDiff'
import { useStudio } from '@/app/studio/use-studio'
import { useParamsChange } from '@/app/windows/use-params-change'
import { SidebarNav } from '@/components/os/SidebarNav'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { patternLabel, themesOf, whyItMatters, type Theme } from './learning-service'

type Section = 'overview' | 'proposals' | 'observations'
type Nav = { section: Section; proposal?: string; theme?: string }

function appNameOf(id: string, state: RuntimeState) {
  return findApp(id)?.name ?? state.executions.find((e) => e.appId === id)?.appName ?? id
}

// ── Overview ────────────────────────────────────────────────────────────

function Overview({ state, go }: { state: RuntimeState; go: (n: Nav) => void }) {
  const themes = themesOf(state)
  const open = state.proposals.filter((p) => p.status === 'open')
  const accepted = state.proposals.filter((p) => p.status === 'accepted')
  const byApp = [...new Set(themes.map((t) => t.appId))]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-semibold">Learning and improvement</h3>
      </div>
      <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-3">
        <div>
          <dt className="text-xs text-muted-foreground">Observations</dt>
          <dd className="text-lg font-semibold tabular-nums">{state.signals.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Proposals to review</dt>
          <dd className="text-lg font-semibold tabular-nums">{open.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Accepted improvements</dt>
          <dd className="text-lg font-semibold tabular-nums">{accepted.length}</dd>
        </div>
      </dl>

      <section aria-label="Requires review" className="space-y-1">
        <h4 className="text-sm font-semibold">Requires review</h4>
        {open.length === 0 ? (
          <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">No proposals waiting.</p>
        ) : (
          <ProposalRows proposals={open} state={state} go={go} />
        )}
      </section>

      <section aria-label="Observations by application" className="space-y-3">
        <h4 className="text-sm font-semibold">What the OS has observed</h4>
        {byApp.length === 0 && <p className="text-sm text-muted-foreground">No observations yet. They are captured from failures, rejections, information requests and manual workarounds in executions.</p>}
        {byApp.map((appId) => (
          <div key={appId} className="space-y-1">
            <h5 className="text-xs font-medium text-muted-foreground">{appNameOf(appId, state)}</h5>
            <ThemeRows themes={themes.filter((t) => t.appId === appId)} go={go} />
          </div>
        ))}
      </section>

      {accepted.length > 0 && (
        <section aria-label="Accepted improvements" className="space-y-1">
          <h4 className="text-sm font-semibold">Accepted improvements</h4>
          <ProposalRows proposals={accepted} state={state} go={go} />
        </section>
      )}
    </div>
  )
}

function ThemeRows({ themes, go }: { themes: Theme[]; go: (n: Nav) => void }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {themes.map((t) => (
        <li key={t.key}>
          <button type="button" onClick={() => go({ section: 'observations', theme: t.key })} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
            <Eye aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{signalTypeLabel[t.type]}</span> at “{t.stepName}”
              <span className="block text-xs text-muted-foreground">
                {patternLabel(t.signals.length)} · latest {formatDateTime(t.latest)}
              </span>
            </span>
            {t.proposal ? <StatusBadge tone={proposalStatusMeta[t.proposal.status].tone}>Proposal {proposalStatusMeta[t.proposal.status].label.toLowerCase()}</StatusBadge> : <span className="text-xs text-muted-foreground">No proposal</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function ProposalRows({ proposals, state, go }: { proposals: ImprovementProposal[]; state: RuntimeState; go: (n: Nav) => void }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {proposals.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => go({ section: 'proposals', proposal: p.id })} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
            <Lightbulb aria-hidden className="size-4 shrink-0 text-warning-ink" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{p.title}</span>
              <span className="block text-xs text-muted-foreground">
                {p.id} · {appNameOf(p.appId, state)} · {sectionLabel[p.section]} · based on {p.signalIds.length} observations
                {p.draftVersion ? ` · draft v${p.draftVersion}` : ''}
              </span>
            </span>
            <StatusBadge tone={proposalStatusMeta[p.status].tone}>{proposalStatusMeta[p.status].label}</StatusBadge>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── Theme detail ────────────────────────────────────────────────────────

function ThemeDetail({ theme, state, go }: { theme: Theme; state: RuntimeState; go: (n: Nav) => void }) {
  const { openApp } = useOs()
  const links = useOperationsLinks()
  const resourceId = theme.signals.find((s) => s.resourceId)?.resourceId
  return (
    <div className="space-y-4">
      <Button size="xs" variant="ghost" className="-ml-2" onClick={() => go({ section: 'observations' })}>
        <ArrowLeft /> All observations
      </Button>
      <header>
        <h3 className="text-lg font-semibold">
          {signalTypeLabel[theme.type]} at “{theme.stepName}”
        </h3>
        <p className="text-sm text-muted-foreground">
          {appNameOf(theme.appId, state)} · {patternLabel(theme.signals.length)}
        </p>
      </header>
      <section aria-label="Observed evidence" className="space-y-2 rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold">Observed</h4>
        <p className="text-xs text-muted-foreground">Facts recorded by the runtime, one entry per execution.</p>
        <ul className="divide-y">
          {theme.signals.map((s) => (
            <li key={s.id} className="space-y-1 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.description}</span>
                <span className="text-xs text-muted-foreground">
                  {s.id} · {formatDateTime(s.at)}
                </span>
              </div>
              <ul className="list-disc pl-5 text-muted-foreground">
                {s.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <Button size="xs" variant="outline" onClick={() => links.openExecution(s.executionId)}>
                Open execution {s.executionId}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Interpretation" className="space-y-2 rounded-lg border border-info/30 bg-info-soft/30 p-4 text-sm">
        <h4 className="font-semibold">Interpretation (proposed, not established)</h4>
        <dl className="grid gap-3 @xl:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Why it matters</dt>
            <dd>{whyItMatters[theme.type]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Where it occurs</dt>
            <dd>
              Workflow step “{theme.stepName}”
              {resourceId && (
                <>
                  {' '}
                  ·{' '}
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => links.openResource(resourceId)}>
                    {resourceId}
                  </button>
                </>
              )}
            </dd>
          </div>
          <div className="@xl:col-span-2">
            <dt className="text-xs text-muted-foreground">Suggested improvement</dt>
            <dd>
              {theme.proposal ? (
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => go({ section: 'proposals', proposal: theme.proposal!.id })}>
                  {theme.proposal.id}: {theme.proposal.title}
                </button>
              ) : theme.signals.length === 1 ? (
                'None yet. One observation is not enough to suggest a change; a proposal appears if it happens again.'
              ) : (
                'No scripted improvement matches this theme.'
              )}
            </dd>
          </div>
        </dl>
      </section>
      <Button size="sm" variant="ghost" onClick={() => openApp('operations', { section: 'applications', app: theme.appId })}>
        Open {appNameOf(theme.appId, state)} in Operations
      </Button>
    </div>
  )
}

// ── Proposal detail & review ───────────────────────────────────────────

function TraceStep({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  const Icon = done ? CheckCircle2 : Circle
  return (
    <li className="flex gap-2">
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', done ? 'text-success-ink' : 'text-muted-foreground/60')} />
      <span>
        <span className={cn('font-medium', !done && 'text-muted-foreground')}>{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  )
}

function ProposalDetail({ proposal, state, go }: { proposal: ImprovementProposal; state: RuntimeState; go: (n: Nav) => void }) {
  const links = useOperationsLinks()
  const { openApp } = useOs()
  const { state: studio, dispatch } = useStudio()
  const [mode, setMode] = useState<'reject' | 'defer' | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const app = getRuntimeApp(proposal.appId, state)
  const signals = state.signals.filter((s) => proposal.signalIds.includes(s.id))
  const builtin = state.builtin[proposal.appId]
  const project = app?.projectId ? studio.projects.find((p) => p.id === app.projectId) : undefined
  const record = getGeneratedApp(proposal.appId)

  // Before/after: published version vs. the draft that contains this change.
  const before = builtin ? builtin.published.blueprint : record?.blueprint
  const after = builtin ? builtin.draft?.blueprint : (project?.blueprint ?? undefined)
  const hasDraft = proposal.status === 'accepted' && after && before && after.version !== before.version
  const validation = builtin ? builtin.draft?.validation : project?.validation && project.validation.blueprintVersion === project.blueprint?.version ? { findings: project.validation.findings, ranAt: project.validation.ranAt } : undefined
  const blocked = validation?.findings.filter((f) => f.status === 'blocked').length ?? 0
  const published = proposal.publishedVersion ?? (record && proposal.draftVersion && record.version === proposal.draftVersion ? record.version : undefined)
  const laterRuns = published ? state.executions.filter((e) => e.appId === proposal.appId && e.blueprintVersion === published) : []

  const accept = () => {
    if (!app) return
    if (app.source === 'builtin') acceptBuiltinProposal(proposal.id)
    else if (project?.blueprint) {
      dispatch({ type: 'improvement/apply', projectId: project.id, patch: proposal.patch, reason: `Accepted improvement ${proposal.id}: ${proposal.title}`, now: new Date().toISOString() })
      recordStudioProposalAccepted(proposal.id, bumpVersion(project.blueprint.version, 'patch'))
    }
  }

  const confirm = () => {
    if (mode === 'reject' && !note.trim()) return setError('Give a reason for rejecting.')
    decideProposal(proposal.id, mode === 'reject' ? 'rejected' : 'deferred', note.trim())
    setMode(null)
    setNote('')
    setError(null)
  }

  return (
    <div className="@container space-y-4">
      <Button size="xs" variant="ghost" className="-ml-2" onClick={() => go({ section: 'proposals' })}>
        <ArrowLeft /> All proposals
      </Button>
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{proposal.title}</h3>
          <p className="text-sm text-muted-foreground">
            {proposal.id} · {app?.name ?? proposal.appId} · affects {sectionLabel[proposal.section]} · proposed {formatDateTime(proposal.createdAt)}
          </p>
        </div>
        <StatusBadge tone={proposalStatusMeta[proposal.status].tone}>{proposalStatusMeta[proposal.status].label}</StatusBadge>
      </header>

      <section aria-label="Proposal" className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <dl className="grid gap-3 @xl:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Problem</dt>
            <dd>{proposal.problem}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Proposed change</dt>
            <dd>{proposal.proposedChange}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expected effect (qualitative)</dt>
            <dd>{proposal.expectedEffect}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Risk or consideration</dt>
            <dd>{proposal.risk}</dd>
          </div>
        </dl>
        <div>
          <h4 className="text-xs text-muted-foreground">Supporting evidence — {signals.length} observations</h4>
          <ul className="mt-1 divide-y rounded-md border">
            {signals.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                <span className="min-w-0 flex-1">
                  {s.description}
                  <span className="block text-xs text-muted-foreground">
                    {s.id} · {signalTypeLabel[s.type]} · {formatDateTime(s.at)}
                  </span>
                </span>
                <Button size="xs" variant="ghost" onClick={() => links.openExecution(s.executionId)}>
                  {s.executionId}
                </Button>
              </li>
            ))}
          </ul>
        </div>
        {proposal.decisionNote && <p className="text-xs text-muted-foreground">Decision note: “{proposal.decisionNote}”</p>}
      </section>

      {(proposal.status === 'open' || proposal.status === 'deferred') && !mode && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Review">
          <Button onClick={accept} disabled={!app || (app.source === 'studio' && !project?.blueprint)}>
            Accept — create a draft version
          </Button>
          <Button variant="outline" onClick={() => setMode('reject')}>
            Reject
          </Button>
          {proposal.status === 'open' && (
            <Button variant="ghost" onClick={() => setMode('defer')}>
              Defer
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">Accepting creates a new draft blueprint version. The published application does not change until the draft is validated and published.</p>
        </div>
      )}
      {mode && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <Label htmlFor="proposal-note">{mode === 'reject' ? 'Reason for rejecting (required)' : 'Note (optional)'}</Label>
          <Textarea id="proposal-note" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={confirm}>{mode === 'reject' ? 'Reject proposal' : 'Defer proposal'}</Button>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Back
            </Button>
          </div>
        </div>
      )}
      {proposal.status === 'rejected' && (
        <Button size="sm" variant="ghost" onClick={() => decideProposal(proposal.id, 'open', '')}>
          Reopen for review
        </Button>
      )}

      {proposal.status === 'accepted' && (
        <section aria-label="Blueprint change" className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">Blueprint change</h4>
            {hasDraft && !published && <StatusBadge tone="warning">Changes pending — not active until published</StatusBadge>}
            {published && <StatusBadge tone="success">Published v{published}</StatusBadge>}
          </div>
          {hasDraft && before && after ? (
            <>
              <p className="text-sm text-muted-foreground">
                Published v{before.version} compared with draft v{after.version}.
              </p>
              <div aria-label="Before and after" role="region">
                <BlueprintDiff before={before} after={after} />
              </div>
            </>
          ) : published ? (
            <p className="text-sm text-muted-foreground">The change is live in v{published}.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Draft v{proposal.draftVersion} is in Application Studio.</p>
          )}

          {!published && builtin?.draft && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => validateBuiltinDraft(proposal.appId)}>
                  {validation ? 'Re-run validation' : 'Run validation'}
                </Button>
                <Button size="sm" disabled={!validation || blocked > 0} onClick={() => publishBuiltinDraft(proposal.appId)}>
                  Publish v{builtin.draft.blueprint.version}
                </Button>
                {!validation && <span className="text-xs text-muted-foreground">Validation is required before publishing.</span>}
              </div>
              {validation && (
                <ul aria-label="Validation results" className="space-y-1 text-sm">
                  <li className="text-xs text-muted-foreground">
                    {validation.findings.filter((f) => f.status === 'passed').length} of {validation.findings.length} checks passed · {formatDateTime(validation.ranAt)}
                  </li>
                  {validation.findings.map((f) => (
                    <li key={f.id} className="flex items-start gap-2">
                      <StatusBadge tone={f.status === 'passed' ? 'success' : f.status === 'blocked' ? 'danger' : 'warning'}>{f.status === 'passed' ? 'Passed' : f.status === 'blocked' ? 'Blocked' : 'Review'}</StatusBadge>
                      <span>{f.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!published && app?.source === 'studio' && project && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
              <span className="min-w-0 flex-1 text-muted-foreground">Publish the draft in Application Studio, where the full blueprint and version history live.</span>
              <Button size="sm" onClick={() => openApp('application-studio', { project: project.id })}>
                Open in Application Studio
              </Button>
            </div>
          )}
        </section>
      )}

      <section aria-label="Improvement traceability" className="space-y-2 rounded-lg border bg-card p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ListTree aria-hidden className="size-4 text-muted-foreground" /> Traceability
        </h4>
        <ol className="space-y-2 text-sm">
          <TraceStep done label="Learning signals" detail={signals.map((s) => s.id).join(', ')} />
          <TraceStep done label="Improvement proposal" detail={`${proposal.id} · ${proposalStatusMeta[proposal.status].label}`} />
          <TraceStep done={Boolean(proposal.draftVersion)} label="Blueprint change" detail={proposal.draftVersion ? `Draft v${proposal.draftVersion} (${sectionLabel[proposal.section]})` : 'Created when accepted'} />
          <TraceStep done={Boolean(published) || (Boolean(validation) && blocked === 0)} label="Validation" detail={published ? 'Passed before publication' : validation ? `${blocked ? `${blocked} blocking issue${blocked === 1 ? '' : 's'}` : 'No blocking issues'}` : 'Not run yet'} />
          <TraceStep done={Boolean(published)} label="Publication" detail={published ? `v${published} is live` : 'Not published — the change is not active'} />
          <TraceStep
            done={laterRuns.length > 0}
            label="Future executions"
            detail={laterRuns.length ? `${laterRuns.map((e) => e.id).join(', ')} ran on v${published}` : published ? `New transactions will run on v${published}` : 'After publication'}
          />
        </ol>
        {laterRuns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {laterRuns.map((e) => (
              <Button key={e.id} size="xs" variant="outline" onClick={() => links.openExecution(e.id)}>
                {e.id}
              </Button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── App ─────────────────────────────────────────────────────────────────

/** OS-level Learning and Improvement workspace. */
export function LearningApp({ params }: AppProps) {
  useApplications()
  const state = useRuntime()
  const links = useOperationsLinks()
  const fromParams = (p: Record<string, string>): Nav => (p.proposal ? { section: 'proposals', proposal: p.proposal } : p.theme ? { section: 'observations', theme: p.theme } : { section: (p.section as Section) || 'overview' })
  const [nav, setNav] = useState<Nav>(() => fromParams(params))
  useParamsChange(params, (p) => setNav(fromParams(p)))
  const themes = useMemo(() => themesOf(state), [state])
  const proposal = nav.proposal ? state.proposals.find((p) => p.id === nav.proposal) : undefined
  const theme = nav.theme ? themes.find((t) => t.key === nav.theme) : undefined
  const open = state.proposals.filter((p) => p.status === 'open').length

  return (
    <RuntimeLinksContext.Provider value={links}>
      <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
        <SidebarNav<Section>
          label="Learning"
          value={nav.section}
          onChange={(section) => setNav({ section })}
          items={[
            { id: 'overview', label: 'Overview', icon: Lightbulb },
            { id: 'proposals', label: 'Proposals', icon: ListTree, meta: open || undefined },
            { id: 'observations', label: 'Observations', icon: Eye, meta: state.signals.length },
          ]}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 @3xl:p-6">
          {nav.section === 'overview' && <Overview state={state} go={setNav} />}
          {nav.section === 'proposals' &&
            (proposal ? (
              <ProposalDetail key={proposal.id} proposal={proposal} state={state} go={setNav} />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Improvement proposals</h3>
                {state.proposals.length === 0 ? (
                  <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">No proposals yet.</p>
                ) : (
                  <ProposalRows proposals={[...state.proposals].reverse()} state={state} go={setNav} />
                )}
              </div>
            ))}
          {nav.section === 'observations' &&
            (theme ? (
              <ThemeDetail theme={theme} state={state} go={setNav} />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Observations</h3>
                {themes.length === 0 ? <p className="text-sm text-muted-foreground">Nothing observed yet.</p> : <ThemeRows themes={themes} go={setNav} />}
              </div>
            ))}
        </main>
      </div>
    </RuntimeLinksContext.Provider>
  )
}
