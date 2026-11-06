import { useState } from 'react'
import { ArrowRight, Blocks, Check, CloudOff, FolderOpen, Minus, Pencil, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useOs } from '@/app/os/use-os'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { lifecycleMeta, lifecycleOf, nextAction } from '../lifecycle'
import { LifecycleTrack } from './LifecycleTrack'
import { useStudio } from '../use-studio'


const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

function IconAction({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn(
            'flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4',
            pressed && 'bg-accent text-accent-foreground hover:bg-accent',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function StudioHeader({
  windowId,
  panelOpen,
  onTogglePanel,
  onAllProjects,
}: {
  windowId: string
  panelOpen: boolean
  onTogglePanel: () => void
  onAllProjects: () => void
}) {
  const { project, dispatch, saveStatus, savedAt } = useStudio()
  const { minimizeWindow } = useOs()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')

  const commitName = () => {
    const name = draftName.trim()
    if (name && name !== project?.name) dispatch({ type: 'project/rename', name })
    setEditing(false)
  }

  const lifecycle = project ? lifecycleOf(project) : null
  const next = project ? nextAction(project) : null

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      {/* The window title already names the Studio; inside a project the header leads with the project. */}
      {!project && (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Blocks className="size-4" />
          </span>
          Application Studio
        </div>
      )}
      {project && (
        <>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                commitName()
              }}
              className="flex items-center gap-1"
            >
              <Input
                autoFocus
                aria-label="Application name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                className="h-7 w-56"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(project.name)
                setEditing(true)
              }}
              className="group flex min-w-0 items-center gap-1.5 rounded-md px-1 text-[15px] outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`Rename ${project.name}`}
            >
              <span className="truncate font-semibold">{project.name}</span>
              <Pencil aria-hidden className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
          {lifecycle && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label={`Lifecycle: ${lifecycleMeta[lifecycle].label}. Show lifecycle`} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <StatusBadge tone={lifecycleMeta[lifecycle].tone}>{lifecycleMeta[lifecycle].label}</StatusBadge>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto max-w-[min(36rem,calc(100vw-2rem))] gap-2 p-3">
                <LifecycleTrack lifecycle={lifecycle} />
                <p className="text-xs text-muted-foreground">{lifecycleMeta[lifecycle].description}</p>
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {project && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground @3xl:flex" aria-live="polite">
            {saveStatus === 'saving' ? (
              <>
                <Spinner className="size-3" /> Saving…
              </>
            ) : saveStatus === 'unavailable' ? (
              <>
                <CloudOff className="size-3" /> Not saved
              </>
            ) : (
              <>
                <Check className="size-3 text-success-ink" /> {savedAt ? `Saved ${timeFormat.format(new Date(savedAt))}` : 'Saved'}
              </>
            )}
          </span>
        )}
        {project && next && next.stage !== project.activeStage && (
          <Button size="sm" onClick={() => dispatch({ type: 'stage/go', stage: next.stage })} aria-label={`Go to next step: ${next.label}`}>
            <span className="hidden @3xl:inline">{next.label}</span>
            <ArrowRight />
          </Button>
        )}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        {project && (
          <IconAction label="All projects" onClick={onAllProjects}>
            <FolderOpen />
          </IconAction>
        )}
        <IconAction label="AI Architect" onClick={onTogglePanel} pressed={panelOpen}>
          <Sparkles />
        </IconAction>
        <IconAction label="Back to desktop" onClick={() => minimizeWindow(windowId)}>
          <Minus />
        </IconAction>
      </div>
    </header>
  )
}
