import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getScenario } from '@/data/studio-scenarios.mock'
import { stageMeta } from '../stageMeta'
import { lifecycleMeta, lifecycleOf, nextAction } from '../lifecycle'
import { STAGES } from '../types'
import { useStudio } from '../use-studio'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Project list: reopen a draft, start a new application, or delete a draft. */
export function StudioHome({ onNew }: { onNew: () => void }) {
  const { state, dispatch } = useStudio()

  return (
    <div className="h-full overflow-y-auto">
      <div className="@container mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight">Your applications</h2>
          </div>
          <Button onClick={onNew}>
            <FilePlus2 />
            Create application
          </Button>
        </div>

        {state.projects.length === 0 ? (
          <Empty className="mt-8 rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen />
              </EmptyMedia>
              <EmptyTitle>No drafts yet</EmptyTitle>
              <EmptyDescription>Describe a business problem and the OS will design an application for it.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" onClick={onNew}>
              Describe a problem
            </Button>
          </Empty>
        ) : (
          <ul aria-label="Applications in progress" className="mt-6 grid gap-3 @3xl:grid-cols-2">
            {state.projects.map((p) => {
              const lifecycle = lifecycleOf(p)
              const StageIcon = stageMeta[p.activeStage].icon
              const done = STAGES.filter((st) => p.progress[st] === 'complete').length
              return (
                <li key={p.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <StageIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getScenario(p.scenarioId)?.label ?? 'Unclassified'} · updated <span className="tabular-nums">{dateFormat.format(new Date(p.updatedAt))}</span>
                      </p>
                    </div>
                    <StatusBadge tone={lifecycleMeta[lifecycle].tone}>{lifecycleMeta[lifecycle].label}</StatusBadge>
                  </div>
                  <div aria-label={`${done} of ${STAGES.length} stages complete`} role="img" className="flex gap-1">
                    {STAGES.map((st) => (
                      <span key={st} className={p.progress[st] === 'complete' ? 'h-1 flex-1 rounded-full bg-primary' : p.progress[st] === 'needs-review' ? 'h-1 flex-1 rounded-full bg-warning' : 'h-1 flex-1 rounded-full bg-muted'} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{nextAction(p) ? `Next: ${nextAction(p)!.label}` : stageMeta[p.activeStage].label}</span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete draft ${p.name}`}
                      onClick={() => {
                        if (window.confirm(`Delete the draft “${p.name}”? Published applications stay on the desktop.`)) {
                          dispatch({ type: 'project/delete', id: p.id })
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                    <Button size="sm" onClick={() => dispatch({ type: 'project/open', id: p.id })}>
                      Open
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
