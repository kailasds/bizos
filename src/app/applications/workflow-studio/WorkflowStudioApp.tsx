import { useState } from 'react'
import { Bot, Cpu, Plug, Scale, User, Workflow, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { getApp } from '@/app/registry/applicationRegistry'
import { SidebarNav } from '@/components/os/SidebarNav'
import { MockBadge } from '@/components/os/MockBadge'
import { Button } from '@/components/ui/button'
import { workflowDefinitions, type WorkflowDefinition } from '@/data/platform.mock'

const kindMeta: Record<WorkflowDefinition['steps'][number]['kind'], { icon: LucideIcon; label: string }> = {
  agent: { icon: Bot, label: 'Agent' },
  worker: { icon: Cpu, label: 'Worker' },
  rule: { icon: Scale, label: 'Rule' },
  human: { icon: User, label: 'Human approval' },
  connector: { icon: Plug, label: 'Connector' },
}

export function WorkflowStudioApp() {
  const { openApp } = useOs()
  const [selectedId, setSelectedId] = useState(workflowDefinitions[0].id)
  const wf = workflowDefinitions.find((w) => w.id === selectedId) ?? workflowDefinitions[0]
  const owner = getApp(wf.appId)

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav
        label="Workflow definitions"
        value={selectedId}
        onChange={setSelectedId}
        items={workflowDefinitions.map((w) => ({ id: w.id, label: w.name, icon: Workflow }))}
        footer={<MockBadge />}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        <p className="mb-6 rounded-lg border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          Read-only preview. Authoring, validation and compilation of workflows arrive in a later phase.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">{wf.name}</h3>
            <p className="text-sm text-muted-foreground">
              v{wf.version} · used by {owner.name}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openApp(wf.appId)}>
            Open {owner.name}
          </Button>
        </div>
        <p className="mt-3 max-w-prose text-sm">{wf.approach}</p>

        <ol className="mt-6 max-w-md">
          {wf.steps.map((step, i) => {
            const meta = kindMeta[step.kind]
            const Icon = meta.icon
            return (
              <li key={step.name} className="relative flex gap-3 pb-3 last:pb-0">
                {i < wf.steps.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-4 w-px bg-border" />}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card">
                  <Icon aria-hidden className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2">
                  <p className="text-sm font-medium">
                    <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · {step.resource}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
