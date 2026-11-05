import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getScenario } from '@/data/studio-scenarios.mock'
import { stageMeta } from '../stageMeta'
import { lifecycleMeta, lifecycleOf, nextAction } from '../lifecycle'
import { useStudio } from '../use-studio'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Project list: reopen a draft, start a new application, or delete a draft. */
export function StudioHome({ onNew }: { onNew: () => void }) {
  const { state, dispatch } = useStudio()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Your applications</h2>
            <p className="text-sm text-muted-foreground">Drafts are saved in this browser. Reopen one to continue where you left off.</p>
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
          <ul className="mt-6 divide-y rounded-lg border bg-card">
            {state.projects.map((p) => {
              const lifecycle = lifecycleOf(p)
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="tabular-nums">{p.id}</span> · {getScenario(p.scenarioId)?.label ?? 'Unclassified'} · {stageMeta[p.activeStage].label} ·{' '}
                      updated <span className="tabular-nums">{dateFormat.format(new Date(p.updatedAt))}</span>
                    </p>
                    {nextAction(p) && <p className="truncate text-xs">Next: {nextAction(p)!.label}</p>}
                  </div>
                  <StatusBadge tone={lifecycleMeta[lifecycle].tone}>{lifecycleMeta[lifecycle].label}</StatusBadge>
                  <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'project/open', id: p.id })}>
                    Open
                  </Button>
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
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
