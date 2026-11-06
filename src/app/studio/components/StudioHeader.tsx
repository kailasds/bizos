import type { ReactNode } from 'react'
import { ArrowRight, Blocks, FolderOpen, Minus } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { nextAction } from '../lifecycle'
import { useStudio } from '../use-studio'
import { IconTile } from './StudioParts'

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-white/80 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Floating top-right cluster. Identity and progress live in the journey navigator. */
export function StudioHeader({ windowId, home, onAllProjects }: { windowId: string; home: boolean; onAllProjects: () => void }) {
  const { project, dispatch } = useStudio()
  const { minimizeWindow } = useOs()
  const next = project ? nextAction(project) : null

  return (
    <header className="pointer-events-none absolute top-[var(--header-top)] right-3 left-3 z-30 flex items-center justify-between gap-2">
      {home ? (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <IconTile icon={Blocks} size="sm" />
          Application Studio
        </div>
      ) : (
        <span />
      )}
      <div className="liquid-glass pointer-events-auto flex items-center gap-0.5 rounded-full p-1">
        {project && next && next.stage !== project.activeStage && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'stage/go', stage: next.stage })}
            aria-label={`Go to next step: ${next.label}`}
            className="mr-0.5 flex h-8 items-center gap-1.5 rounded-full bg-studio-ink px-3 text-xs font-medium whitespace-nowrap text-white outline-none hover:bg-studio-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="hidden @3xl:inline">{next.label}</span>
            <ArrowRight className="size-3.5" />
          </button>
        )}
        {project && (
          <IconAction label="All projects" onClick={onAllProjects}>
            <FolderOpen />
          </IconAction>
        )}
        <IconAction label="Back to desktop" onClick={() => minimizeWindow(windowId)}>
          <Minus />
        </IconAction>
      </div>
    </header>
  )
}
