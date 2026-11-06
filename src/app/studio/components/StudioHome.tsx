import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getScenario } from '@/data/studio-scenarios.mock'
import { stageMeta } from '../stageMeta'
import { lifecycleMeta, lifecycleOf, nextAction } from '../lifecycle'
import { STAGES } from '../types'
import { useStudio } from '../use-studio'
import { ctaClass, IconTile } from './StudioParts'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Project list: reopen a draft, start a new application, or delete a draft. */
export function StudioHome({ onNew }: { onNew: () => void }) {
  const { state, dispatch } = useStudio()

  return (
    <div className="h-full overflow-y-auto">
      <div className="@container mx-auto max-w-4xl px-6 pt-20 pb-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <p className="text-lg font-semibold tracking-tight text-muted-foreground/70">Pick up where you left off,</p>
            <h2 className="headline-gradient w-fit text-2xl font-bold tracking-tight">or describe a new problem.</h2>
          </div>
          <Button className={ctaClass} onClick={onNew}>
            <FilePlus2 />
            Create application
          </Button>
        </div>

        {state.projects.length === 0 ? (
          <Empty className="studio-card mt-8 rounded-[24px]">
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
                <li key={p.id} className="studio-card flex flex-col gap-3 rounded-[24px] p-4">
                  <div className="flex items-start gap-3">
                    <IconTile icon={StageIcon} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getScenario(p.scenarioId)?.label ?? 'Unclassified'} · updated <span className="tabular-nums">{dateFormat.format(new Date(p.updatedAt))}</span>
                      </p>
                    </div>
                    <StatusBadge tone={lifecycleMeta[lifecycle].tone}>{lifecycleMeta[lifecycle].label}</StatusBadge>
                  </div>
                  <div aria-label={`${done} of ${STAGES.length} stages complete`} role="img" className="flex items-center gap-1">
                    {STAGES.map((st) => {
                      const Icon = stageMeta[st].icon
                      return (
                        <span key={st} className="flex min-w-0 flex-1 items-center gap-1 last:flex-none">
                          <span className={p.progress[st] === 'complete' ? 'flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-white' : p.progress[st] === 'needs-review' ? 'flex size-6 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-ink' : 'flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'}>
                            <Icon className="size-3" />
                          </span>
                          {st !== 'publish' && <span className={p.progress[st] === 'complete' ? 'h-0.5 flex-1 rounded-full bg-primary' : 'h-0.5 flex-1 rounded-full bg-studio-ink/10'} />}
                        </span>
                      )
                    })}
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
                    <Button size="sm" className="rounded-full" onClick={() => dispatch({ type: 'project/open', id: p.id })}>
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
