import { useState } from 'react'
import { Blocks, Check, CloudOff, FolderOpen, Minus, PanelRightClose, PanelRightOpen, Pencil } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { lifecycleLabel, lifecycleOf } from '../studioReducer'
import type { Lifecycle } from '../types'
import { useStudio } from '../use-studio'

const lifecycleTone: Record<Lifecycle, StatusTone> = {
  discovery: 'neutral',
  draft: 'info',
  ready: 'success',
  published: 'success',
  'changes-pending': 'warning',
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

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

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-chrome px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Blocks aria-hidden className="size-4 text-muted-foreground" />
        Application Studio
      </div>
      {project && (
        <>
          <span aria-hidden className="h-4 w-px bg-border" />
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
              className="group flex min-w-0 items-center gap-1.5 rounded-md px-1 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`Rename ${project.name}`}
            >
              <span className="truncate font-medium">{project.name}</span>
              <Pencil aria-hidden className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
          {lifecycle && <StatusBadge tone={lifecycleTone[lifecycle]}>{lifecycleLabel[lifecycle]}</StatusBadge>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
            {saveStatus === 'saving' ? (
              <>
                <Spinner className="size-3" /> Saving…
              </>
            ) : saveStatus === 'unavailable' ? (
              <>
                <CloudOff className="size-3" /> Not saved — browser storage unavailable
              </>
            ) : (
              <>
                <Check className="size-3" /> {savedAt ? `Saved locally ${timeFormat.format(new Date(savedAt))}` : 'Saved locally'}
              </>
            )}
          </span>
        </>
      )}
      <div className="ml-auto flex items-center gap-1">
        <MockBadge label="Prototype intelligence" className="hidden @3xl:inline-flex" />
        {project && (
          <Button size="sm" variant="ghost" onClick={onAllProjects}>
            <FolderOpen />
            All projects
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onTogglePanel} aria-pressed={panelOpen}>
          {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
          <span className="hidden @3xl:inline">AI Architect</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => minimizeWindow(windowId)}>
          <Minus />
          <span className="hidden @3xl:inline">Back to desktop</span>
        </Button>
      </div>
    </header>
  )
}
