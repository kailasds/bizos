import type { ReactNode } from 'react'
import { CheckCircle2, ExternalLink, Minus, Rocket } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getFolder, registerGeneratedApp } from '@/app/registry/applicationRegistry'
import type { GeneratedAppId } from '@/app/registry/types'
import { StatusBadge } from '@/components/os/StatusBadge'
import { InfoTip } from '@/components/os/InfoTip'
import { Button } from '@/components/ui/button'
import { getScenario } from '@/data/studio-scenarios.mock'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { readinessMeta, readinessOf } from '@/app/services/mock/blueprint-service'
import { LifecycleTrack } from '../components/LifecycleTrack'
import { lifecycleMeta, lifecycleOf } from '../lifecycle'
import { useStudio } from '../use-studio'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b px-4 py-3 last:border-0 @3xl:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function PublishStage({ windowId }: { windowId: string }) {
  const { project, dispatch } = useStudio()
  const { openApp, minimizeWindow, pushNotification } = useOs()
  const sim = useSimulation(700)

  if (!project?.blueprint) {
    return <StagePrerequisite stage="publish" requires="generate" message="Generate and validate the Application Blueprint before publishing." />
  }

  const bp = project.blueprint
  const scenario = getScenario(project.scenarioId)
  const folder = getFolder(bp.domain)
  const resources = Object.values(bp.resources).flat()
  const findings = project.validation?.findings ?? []
  const acknowledged = project.validation?.acknowledged.length ?? 0
  const ready = project.progress.validate === 'complete'
  const lifecycle = lifecycleOf(project)
  const appId = bp.applicationId as GeneratedAppId

  const steps = [
    `Packaging blueprint v${bp.version}`,
    'Pinning resource versions',
    'Registering with the application registry',
    `Adding to the desktop and ${folder?.name ?? bp.domain} folder`,
  ]

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

  return (
    <StageFrame
      stage="publish"
      footer={
        sim.running ? null : published ? (
          <>
            <Button variant="ghost" onClick={() => minimizeWindow(windowId)}>
              <Minus />
              Back to desktop
            </Button>
            <Button onClick={() => openApp(appId)}>
              <ExternalLink />
              Open {project.name}
            </Button>
          </>
        ) : (
          <>
            {!ready && (
              <span className="mr-auto text-sm text-muted-foreground">
                Validation must pass first.{' '}
                <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => dispatch({ type: 'stage/go', stage: 'validate' })}>
                  Go to Validate
                </button>
              </span>
            )}
            <Button disabled={!ready} onClick={publish}>
              <Rocket />
              {project.publication ? `Publish update v${bp.version}` : 'Publish application'}
            </Button>
          </>
        )
      }
    >
      {sim.running ? (
        <div className="rounded-xl border bg-card p-6" aria-busy>
          <p className="mb-4 text-sm font-medium">Publishing {project.name}…</p>
          <StepList label="Publishing" steps={steps} current={sim.step} />
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-label="Lifecycle" className="space-y-2">
            <div className="flex items-center gap-1">
              <LifecycleTrack lifecycle={lifecycle} />
              <InfoTip label="About this stage of the lifecycle">{lifecycleMeta[lifecycle].description}</InfoTip>
            </div>
          </section>
          {project.publication && (
            <div role="status" className={published ? 'flex items-start gap-3 rounded-xl border border-success/40 bg-success-soft/60 p-4' : 'flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft/60 p-4'}>
              <CheckCircle2 aria-hidden className={published ? 'mt-0.5 size-5 text-success-ink' : 'mt-0.5 size-5 text-warning-ink'} />
              <div className="text-sm">
                <p className="font-semibold">
                  {published ? `Published v${project.publication.version}` : `v${project.publication.version} is published; this draft has changes (v${bp.version})`}
                </p>
                <p className="text-muted-foreground">
                  {published
                    ? `Registered ${timeFormat.format(new Date(project.publication.publishedAt))}. It opens from the desktop, the ${folder?.name} folder and the launcher like any other application.`
                    : 'People using the application still see the published version until you publish this update.'}
                </p>
              </div>
            </div>
          )}

          <dl className="rounded-xl border bg-card">
            <Fact label="Application">
              <span className="font-medium">{project.name}</span> <span className="text-muted-foreground tabular-nums">· {bp.applicationId}</span>
            </Fact>
            <Fact label="Description">{bp.description}</Fact>
            <Fact label="Domain">
              <span className="capitalize">{bp.domain}</span> · domain pack {bp.domainPack.version}
            </Fact>
            <Fact label="Architecture">{bp.solutionArchitecture.name}</Fact>
            <Fact label="Resources">
              {resources.length} pinned:{' '}
              {resources.map((r) => `${r.name} ${r.version}${r.origin === 'created' ? ' (new)' : ''}`).join(', ')}
            </Fact>
            <Fact label="Workflow">{bp.workflow.nodes.map((n) => n.name).join(' → ')}</Fact>
            <Fact label="Screens">{bp.experience.pages.map((p) => p.title).join(' · ')}</Fact>
            <Fact label="Version">
              v{bp.version}
              {project.publications.length > 0 && (
                <span className="text-muted-foreground"> · previously published: {project.publications.map((p) => `v${p.version}`).join(', ')}</span>
              )}
            </Fact>
            <Fact label="Validation">
              {project.validation ? (
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={readinessMeta[readinessOf(project)].tone}>{readinessMeta[readinessOf(project)].label}</StatusBadge>
                  <span className="text-muted-foreground">
                    {findings.length} findings{acknowledged ? `, ${acknowledged} accepted for this version` : ''} · checked v{project.validation.blueprintVersion}
                  </span>
                </span>
              ) : (
                <StatusBadge tone="neutral">Not run</StatusBadge>
              )}
            </Fact>
            <Fact label="Deployment">
              Enterprise AI OS desktop · {folder?.name} folder
            </Fact>
          </dl>
        </div>
      )}
    </StageFrame>
  )
}
