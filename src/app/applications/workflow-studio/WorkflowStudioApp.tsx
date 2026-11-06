import { useState } from 'react'
import { ArrowRight, Bot, Cpu, Eye, Plug, Scale, User, Workflow, X, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import { MockBadge } from '@/components/os/MockBadge'
import { SidebarNav } from '@/components/os/SidebarNav'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { workflowDefinitions, type WorkflowDefinition } from '@/data/platform.mock'
import { cn } from '@/lib/utils'

type StepKind = WorkflowDefinition['steps'][number]['kind']

const kindMeta: Record<StepKind, { icon: LucideIcon; label: string; tone: string }> = {
  agent: { icon: Bot, label: 'Agent', tone: 'text-tint-blue' },
  worker: { icon: Cpu, label: 'Worker', tone: 'text-tint-teal' },
  rule: { icon: Scale, label: 'Rule', tone: 'text-tint-graphite' },
  human: { icon: User, label: 'Human approval', tone: 'text-warning-ink' },
  connector: { icon: Plug, label: 'Connector', tone: 'text-tint-coral' },
}

/** Workflow canvas: the flow first, configuration in context when a step is selected. */
export function WorkflowStudioApp() {
  const { openApp } = useOs()
  const [selectedId, setSelectedId] = useState(workflowDefinitions[0].id)
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const wf = workflowDefinitions.find((w) => w.id === selectedId) ?? workflowDefinitions[0]
  const owner = getApp(wf.appId)
  const step = stepIndex === null ? null : wf.steps[stepIndex]
  const counts = (Object.keys(kindMeta) as StepKind[]).map((k) => ({ kind: k, n: wf.steps.filter((s) => s.kind === k).length })).filter((c) => c.n > 0)

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav
        label="Workflow definitions"
        value={selectedId}
        onChange={(id) => {
          setSelectedId(id)
          setStepIndex(null)
        }}
        items={workflowDefinitions.map((w) => ({ id: w.id, label: w.name, icon: Workflow }))}
        footer={<MockBadge />}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-6 py-3">
          <h3 className="text-lg font-semibold">{wf.name}</h3>
          <span className="text-sm text-muted-foreground tabular-nums">v{wf.version}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex items-center gap-1 rounded-full border px-2 text-xs leading-5 text-muted-foreground">
                <Eye aria-hidden className="size-3" /> Read-only
              </span>
            </TooltipTrigger>
            <TooltipContent>Authoring arrives in a later phase.</TooltipContent>
          </Tooltip>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => openApp(wf.appId)}>
            Open {owner.name}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col @4xl:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:16px_16px] p-6">
            <p className="mb-5 max-w-prose text-sm text-muted-foreground">{wf.approach}</p>
            <ol aria-label="Workflow canvas" className="flex flex-wrap items-center gap-y-4">
              {wf.steps.map((s, i) => {
                const meta = kindMeta[s.kind]
                const Icon = meta.icon
                const active = stepIndex === i
                return (
                  <li key={s.name} className="flex items-center">
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={`${i + 1}. ${s.name} — ${meta.label}`}
                      onClick={() => setStepIndex(active ? null : i)}
                      className={cn(
                        'flex w-40 flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5 text-left shadow-[0_1px_2px_oklch(0.2_0.02_220/0.06)] outline-none hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50',
                        active && 'border-primary ring-2 ring-primary/20',
                        s.kind === 'human' && 'border-warning/60',
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon aria-hidden className={cn('size-3.5', meta.tone)} />
                        {meta.label}
                        <span className="ml-auto tabular-nums">{i + 1}</span>
                      </span>
                      <span className="text-sm leading-tight font-medium">{s.name}</span>
                    </button>
                    {i < wf.steps.length - 1 && <ArrowRight aria-hidden className="mx-1.5 size-4 shrink-0 text-muted-foreground/60" />}
                  </li>
                )
              })}
            </ol>
            <ul aria-label="Step mix" className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {counts.map(({ kind, n }) => {
                const Icon = kindMeta[kind].icon
                return (
                  <li key={kind} className="flex items-center gap-1">
                    <Icon aria-hidden className={cn('size-3.5', kindMeta[kind].tone)} />
                    <span className="tabular-nums">{n}</span> {kindMeta[kind].label.toLowerCase()}
                  </li>
                )
              })}
            </ul>
          </div>

          {step && stepIndex !== null && (
            <aside aria-label="Step configuration" className="w-full shrink-0 border-t bg-card p-4 @4xl:w-64 @4xl:border-t-0 @4xl:border-l">
              <div className="flex items-start gap-2">
                <h4 className="min-w-0 flex-1 text-sm font-semibold">{step.name}</h4>
                <Button size="icon-xs" variant="ghost" aria-label="Close step configuration" onClick={() => setStepIndex(null)}>
                  <X />
                </Button>
              </div>
              <dl className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Position</dt>
                <dd className="tabular-nums">
                  {stepIndex + 1} of {wf.steps.length}
                </dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{kindMeta[step.kind].label}</dd>
                <dt className="text-muted-foreground">{step.kind === 'human' ? 'Assignee' : 'Resource'}</dt>
                <dd>{step.resource}</dd>
                <dt className="text-muted-foreground">Next</dt>
                <dd>{wf.steps[stepIndex + 1]?.name ?? 'End'}</dd>
              </dl>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
