import { ArrowRight, Blocks } from 'lucide-react'
import { nextAction } from '../lifecycle'
import { useStudio } from '../use-studio'
import { IconTile } from './StudioParts'

/** The next step, floating top right. The window's own controls minimize and close it; drafts are listed from the journey navigator. */
export function StudioHeader({ home }: { home: boolean }) {
  const { project, dispatch } = useStudio()
  const next = project ? nextAction(project) : null
  const showNext = Boolean(project && next && next.stage !== project.activeStage)

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
      {showNext && project && next && (
        <div className="liquid-glass pointer-events-auto flex items-center rounded-full p-1">
          <button
            type="button"
            onClick={() => dispatch({ type: 'stage/go', stage: next.stage })}
            aria-label={`Go to next step: ${next.label}`}
            className="flex h-8 items-center gap-1.5 rounded-full bg-studio-ink px-3 text-xs font-medium whitespace-nowrap text-white outline-none hover:bg-studio-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="hidden @3xl:inline">{next.label}</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}
    </header>
  )
}
