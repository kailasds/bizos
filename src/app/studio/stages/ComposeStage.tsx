import { ArrowRight, Bot, BookOpen, Cpu, Plug, SearchX, Server, type LucideIcon } from 'lucide-react'
import type { ResourceKind } from '@/app/blueprint/types'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { compositionSequence } from '@/data/studio-resources.mock'
import { StageFrame, StagePrerequisite } from '../components/StageFrame'
import { StepList } from '../components/StepList'
import { useSimulation } from '../hooks/use-simulation'
import { composedWorker, proposalFor } from '../services/intelligence'
import type { CapabilityMapping, MappingStatus } from '../types'
import { useStudio } from '../use-studio'

const kindMeta: Record<ResourceKind, { label: string; icon: LucideIcon }> = {
  agent: { label: 'Agent', icon: Bot },
  worker: { label: 'AI Worker', icon: Cpu },
  connector: { label: 'Connector', icon: Plug },
  knowledge: { label: 'Domain knowledge', icon: BookOpen },
  service: { label: 'OS service', icon: Server },
}

const statusMeta: Record<MappingStatus, { tone: StatusTone; label: string }> = {
  available: { tone: 'success', label: 'Available' },
  restricted: { tone: 'warning', label: 'Available with conditions' },
  missing: { tone: 'danger', label: 'Missing' },
  created: { tone: 'info', label: 'Created for this app' },
}

function GapResolver({ mapping, domain }: { mapping: CapabilityMapping; domain: Parameters<typeof composedWorker>[1] }) {
  const { dispatch } = useStudio()
  const sim = useSimulation(750)
  const proposal = proposalFor(mapping.capabilityId)

  const approve = () =>
    sim.run(compositionSequence.length, () =>
      dispatch({
        type: 'compose/workerCreated',
        worker: { capabilityId: mapping.capabilityId, resource: composedWorker(mapping.capabilityId, domain), createdAt: new Date().toISOString() },
      }),
    )

  return (
    <section aria-label={`Missing capability: ${mapping.need}`} className="rounded-xl border border-danger/30 bg-card">
      <header className="flex items-start gap-2 border-b px-4 py-3">
        <SearchX aria-hidden className="mt-0.5 size-4 shrink-0 text-danger-ink" />
        <div>
          <h3 className="text-sm font-semibold">{mapping.need} is missing</h3>
          <p className="text-sm text-muted-foreground">{proposal?.whyNeeded ?? 'The selected approach needs this capability, and no existing resource provides it.'}</p>
        </div>
      </header>

      {proposal ? (
        <div className="space-y-4 px-4 py-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Checked for reuse first</h4>
            <ul className="mt-1 space-y-1 text-sm">
              {proposal.reuseChecked.map((r) => (
                <li key={r.resource}>
                  <span className="font-medium">{r.resource}</span> — {r.reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-dashed border-foreground/25 bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold">{proposal.name}</h4>
              <span className="rounded-full border border-dashed border-foreground/30 px-2 text-xs leading-5 text-muted-foreground">Proposed — not created</span>
            </div>
            <p className="mt-1 text-sm">{proposal.purpose}</p>
            <dl className="mt-3 grid gap-3 text-sm @3xl:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Skills</dt>
                <dd>{proposal.skills.join(' · ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Agent access</dt>
                <dd>{proposal.agentAccess.join(' · ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Knowledge</dt>
                <dd>{proposal.knowledge.join(' · ')}</dd>
              </div>
            </dl>
          </div>

          {sim.running ? (
            <div aria-busy>
              <p className="mb-2 text-sm font-medium">Composing {proposal.name} (simulated)…</p>
              <StepList label="Worker composition" steps={compositionSequence} current={sim.step} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={approve}>Approve and compose worker</Button>
              <Button variant="ghost" onClick={() => dispatch({ type: 'stage/go', stage: 'architect' })}>
                Choose a different approach
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                Approval is required before the OS asks the AI Workers Platform for a new worker. In this prototype nothing is created outside the browser.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2 px-4 py-3">
          <Button variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: 'architect' })}>
            Choose a different approach
          </Button>
        </div>
      )}
    </section>
  )
}

const compileSteps = ['Compiling the workflow', 'Deriving the data model', 'Building screens from the component catalogue', 'Assembling the blueprint']

export function ComposeStage() {
  const { project, dispatch } = useStudio()
  const sim = useSimulation(600)

  if (!project?.composition || !project.discover.domain) {
    return <StagePrerequisite stage="compose" requires="architect" message="Choose a solution approach first. Resources are discovered for the approach you select." />
  }

  const { mappings } = project.composition
  const missing = mappings.filter((m) => m.status === 'missing')
  const reused = mappings.filter((m) => m.status === 'available' || m.status === 'restricted').length
  const created = mappings.filter((m) => m.status === 'created').length

  return (
    <StageFrame
      stage="compose"
      aside={
        <p className="text-xs text-muted-foreground tabular-nums">
          {mappings.length} needs · {reused} reused · {created} created · {missing.length} missing
        </p>
      }
      footer={
        sim.running ? (
          <div className="mr-auto">
            <StepList label="Generating blueprint" steps={compileSteps} current={sim.step} />
          </div>
        ) : (
          <>
            {missing.length > 0 && <span className="mr-auto text-sm text-muted-foreground">Resolve the missing capability to continue.</span>}
            <Button disabled={missing.length > 0} onClick={() => sim.run(compileSteps.length, () => dispatch({ type: 'compose/confirm', now: new Date().toISOString() }))}>
              {project.blueprint ? 'Regenerate blueprint' : 'Generate blueprint'}
              <ArrowRight />
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Required capabilities and the resources mapped to them</caption>
            <thead className="bg-chrome text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Required capability</th>
                <th className="px-3 py-2 font-medium">Resource</th>
                <th className="hidden px-3 py-2 font-medium @3xl:table-cell">Owned by</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => {
                const Icon = kindMeta[m.resource?.kind ?? m.category].icon
                return (
                  <tr key={m.id} className="border-b align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{m.need}</p>
                      <p className="text-xs text-muted-foreground">{kindMeta[m.resource?.kind ?? m.category].label}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.resource ? (
                        <div className="flex gap-2">
                          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p>
                              {m.resource.name} <span className="text-xs text-muted-foreground tabular-nums">{m.resource.version}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{m.resource.note}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No existing resource</p>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted-foreground @3xl:table-cell">{m.resource?.owner ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={statusMeta[m.status].tone}>{statusMeta[m.status].label}</StatusBadge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          The OS reads these resources from their owning platforms; it does not become their source of truth. Versions are pinned when the blueprint is generated.
        </p>

        {missing.map((m) => (
          <GapResolver key={m.id} mapping={m} domain={project.discover.domain!} />
        ))}
      </div>
    </StageFrame>
  )
}
