import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Blocks, CheckCircle2, ChevronDown, ExternalLink, FolderOpen, LayoutPanelTop, Minus, Network, Rocket, Users, Workflow, type LucideIcon } from 'lucide-react'
import { validateBlueprint } from '@/app/blueprint/validate'
import { useOs } from '@/app/os/use-os'
import { getFolder, registerGeneratedApp } from '@/app/registry/applicationRegistry'
import type { GeneratedAppId } from '@/app/registry/types'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { InfoTip } from '@/components/os/InfoTip'
import { StatusBadge } from '@/components/os/StatusBadge'
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
import { getScenario } from '@/data/studio-scenarios.mock'
import { cn } from '@/lib/utils'
import { DecisionCard } from '../components/DecisionCard'
import { LifecycleTrack } from '../components/LifecycleTrack'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { ctaClass, IconTile } from '../components/StudioParts'
import { useSimulation } from '../hooks/use-simulation'
import { lifecycleMeta, lifecycleOf } from '../lifecycle'
import type { StageId, ValidationFinding } from '../types'
import { useStudio } from '../use-studio'
import type { GenerateTab } from './GenerateStage'

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function FactTile({ icon, value, label, chips }: { icon: LucideIcon; value: ReactNode; label: string; chips?: string[] }) {
  return (
    <div title={chips?.join(' · ')} className="studio-card flex items-center gap-3 rounded-[20px] p-3">
      <IconTile icon={icon} size="sm" />
      <div className="min-w-0">
        <p className="text-base leading-tight font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/** The application as it will appear on the desktop. */
function DesktopPreview({ name, folder, version, live }: { name: string; folder: string; version: string; live: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative flex min-h-56 flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-[image:var(--wallpaper)] p-6">
      <motion.div initial={reduce ? false : { y: 16, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="liquid-glass flex w-52 flex-col items-center gap-2 rounded-[22px] p-4 text-center">
        <span className="relative">
          {live && <span aria-hidden className="studio-pulse absolute inset-0 rounded-[20px] bg-success/40" />}
          <IconTile icon={live ? CheckCircle2 : Blocks} size="xl" />
        </span>
        <span className="text-sm leading-tight font-semibold text-balance">{name}</span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <FolderOpen aria-hidden className="size-3" />
          <span className="capitalize">{folder}</span> · v{version}
        </span>
      </motion.div>
    </div>
  )
}

export function PublishStage({ windowId, goTo }: { windowId: string; goTo: (stage: StageId, tab?: GenerateTab) => void }) {
  const { project, dispatch } = useStudio()
  const { openApp, minimizeWindow, pushNotification } = useOs()
  const sim = useSimulation(700)
  const [showAll, setShowAll] = useState(false)
  const [accepting, setAccepting] = useState<ValidationFinding | null>(null)
  const blueprint = project?.blueprint
  const mappings = project?.composition?.mappings
  const checkedVersion = project?.validation?.blueprintVersion

  // The checks are automatic: whenever this version has not been checked, check it.
  useEffect(() => {
    if (!blueprint || !mappings || checkedVersion === blueprint.version) return
    dispatch({ type: 'validate/result', findings: validateBlueprint(blueprint, mappings), now: new Date().toISOString() })
  }, [blueprint, mappings, checkedVersion, dispatch])

  if (!project?.blueprint) {
    return <StagePrerequisite stage="publish" requires="generate" message="Generate the blueprint before publishing." />
  }

  const bp = project.blueprint
  const scenario = getScenario(project.scenarioId)
  const folder = getFolder(bp.domain)
  const resources = Object.values(bp.resources).flat()
  const readiness = readinessOf(project)
  const ready = readiness === 'ready' || readiness === 'accepted'
  const decisions = (project.validation?.findings ?? []).filter((f) => f.status !== 'passed' && !project.validation?.acknowledged.includes(f.id)).sort((a, b) => Number(b.status === 'blocked') - Number(a.status === 'blocked'))
  const lifecycle = lifecycleOf(project)
  const appId = bp.applicationId as GeneratedAppId

  const steps = [`Packaging blueprint v${bp.version}`, 'Pinning resource versions', 'Registering with the application registry', `Adding to the desktop and ${folder?.name ?? bp.domain} folder`]

  const publish = () =>
    sim.run(steps.length, () => {
      const now = new Date().toISOString()
      registerGeneratedApp({
        id: appId,
        name: project.name,
        description: bp.description,
        domain: bp.domain,
        iconKey: scenario?.iconKey ?? 'app',
        tint: scenario?.tint ?? 'blue',
        version: bp.version,
        owner: 'Published from Application Studio',
        projectId: project.id,
        publishedAt: now,
        blueprint: { ...bp, name: project.name, status: 'published' },
      })
      dispatch({ type: 'publish/done', appId, version: bp.version, now })
      pushNotification({
        title: `${project.name} published`,
        body: `Version ${bp.version} is on the desktop and in the ${folder?.name ?? bp.domain} folder.`,
        at: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        tone: 'success',
        source: 'Application Studio',
        target: { appId, label: 'Open application' },
      })
    })

  const published = lifecycle === 'published'
  const earlier = project.publications.filter((p) => p.version !== bp.version)

  return (
    <StageFrame
      stage="publish"
      thinking={sim.running ? { title: `Publishing ${project.name}…`, label: 'Publishing', steps, current: sim.step, results: [undefined, `${resources.length} pinned`, undefined, undefined] } : null}
      footer={
        published ? (
          <>
            <Button variant="ghost" className="rounded-full" onClick={() => minimizeWindow(windowId)}>
              <Minus />
              Back to desktop
            </Button>
            <Button className={ctaClass} onClick={() => openApp(appId)}>
              <ExternalLink />
              Open {project.name}
            </Button>
          </>
        ) : (
          <>
            {decisions.length > 0 && (
              <span className="text-muted-foreground tabular-nums">
                {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'} first
              </span>
            )}
            <Button className={ctaClass} disabled={!ready || sim.running} onClick={publish}>
              <Rocket />
              {project.publication ? `Publish update v${bp.version}` : 'Publish application'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <section aria-label="Lifecycle" className="flex items-center gap-1">
          <LifecycleTrack lifecycle={lifecycle} />
          <InfoTip label="About this stage of the lifecycle">{lifecycleMeta[lifecycle].description}</InfoTip>
        </section>

        {project.publication && (
          <div role="status" className={cn('flex items-center gap-3 rounded-[22px] p-3.5', published ? 'bg-success-soft/80' : 'bg-warning-soft/80')}>
            <CheckCircle2 aria-hidden className={cn('size-5 shrink-0', published ? 'text-success-ink' : 'text-warning-ink')} />
            <div className="text-[13px] leading-snug">
              <p className="font-semibold">{published ? `Published v${project.publication.version}` : `v${project.publication.version} is live; this draft has changes (v${bp.version})`}</p>
              <p className="text-muted-foreground">{published ? `Registered ${timeFormat.format(new Date(project.publication.publishedAt))}.` : 'People still see the published version until you publish this update.'}</p>
            </div>
          </div>
        )}

        {decisions.length > 0 && !sim.running && (
          <ul aria-label="Decisions before publishing" className="space-y-2.5">
            {decisions.map((f) => (
              <DecisionCard key={f.id} finding={f} goTo={goTo} onAccept={setAccepting} />
            ))}
          </ul>
        )}

        <div className="grid gap-3 @4xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <DesktopPreview name={project.name} folder={folder?.name ?? bp.domain} version={bp.version} live={published} />
          <div className="grid grid-cols-2 gap-2.5 @6xl:grid-cols-3">
            <FactTile icon={Network} value={resources.length} label="resources pinned" chips={resources.map((r) => r.name)} />
            <FactTile icon={Workflow} value={bp.workflow.nodes.length} label="workflow steps" chips={bp.workflow.nodes.map((n) => n.name)} />
            <FactTile icon={LayoutPanelTop} value={bp.experience.pages.length} label="screens" chips={bp.experience.pages.map((p) => p.title)} />
            <FactTile icon={Users} value={bp.security.roles.length} label="roles" chips={bp.security.roles.map((r) => r.name)} />
            <FactTile icon={Blocks} value={`v${bp.version}`} label={earlier.length ? `after ${earlier.map((p) => `v${p.version}`).join(', ')}` : 'first version'} />
            <div className="studio-card flex flex-col items-start justify-center gap-1 rounded-[20px] p-3">
              <StatusBadge tone={readinessMeta[readiness].tone}>{readinessMeta[readiness].label}</StatusBadge>
              <p className="text-[11px] text-muted-foreground">publish status</p>
            </div>
          </div>
        </div>

        <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          Full review
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', showAll && 'rotate-180')} />
        </button>
        {showAll && (
          <dl className="studio-card grid gap-3 rounded-[22px] p-4 text-[13px] leading-snug @4xl:grid-cols-2">
            {(
              [
                ['Application', `${project.name} · ${bp.applicationId}`],
                ['Description', bp.description],
                ['Domain', `${bp.domain} · domain pack ${bp.domainPack.version}`],
                ['Architecture', bp.solutionArchitecture.name],
                ['Resources', resources.map((r) => `${r.name} ${r.version}${r.origin === 'created' ? ' (new)' : ''}`).join(', ')],
                ['Workflow', bp.workflow.nodes.map((n) => n.name).join(' → ')],
                ['Screens', bp.experience.pages.map((p) => p.title).join(' · ')],
                ['Deployment', `Enterprise AI OS desktop · ${folder?.name} folder`],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

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
