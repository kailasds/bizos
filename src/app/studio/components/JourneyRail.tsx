import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, ChevronLeft, CloudOff, PanelLeftClose, PanelLeftOpen, Pencil } from 'lucide-react'
import { stageOutcome } from '@/app/services/mock/thought-chain-service'
import { StatusBadge } from '@/components/os/StatusBadge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { lifecycleMeta, lifecycleOf } from '../lifecycle'
import { stageMeta } from '../stageMeta'
import { STAGES, type StageId, type StudioProject } from '../types'
import { useStudio } from '../use-studio'
import { LifecycleTrack } from './LifecycleTrack'

const statusLabel = { complete: 'Completed', 'needs-review': 'Needs review', 'not-started': 'Not started' } as const
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

export type RailMode = 'bar' | 'icons' | 'full'

/** Completed levels as a ring around the current level number. */
function ProgressRing({ done, total, current }: { done: number; total: number; current: number }) {
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center" role="img" aria-label={`${done} of ${total} levels complete`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="oklch(0.3 0.03 235 / 0.1)" strokeWidth="4" />
        <motion.circle cx="22" cy="22" r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - done / total) }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </svg>
      <span className="text-[13px] font-bold tabular-nums">{current}</span>
    </span>
  )
}

function ProjectName({ project }: { project: StudioProject }) {
  const { dispatch } = useStudio()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const commit = () => {
    const name = draft.trim()
    if (name && name !== project.name) dispatch({ type: 'project/rename', name })
    setEditing(false)
  }
  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          commit()
        }}
      >
        <Input autoFocus aria-label="Application name" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} className="h-7 w-full bg-white/80 text-sm" />
      </form>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(project.name)
        setEditing(true)
      }}
      aria-label={`Rename ${project.name}`}
      className="group flex w-full min-w-0 items-center gap-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="line-clamp-2 text-sm leading-tight font-semibold">{project.name}</span>
      <Pencil aria-hidden className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  )
}

function SaveState() {
  const { saveStatus, savedAt } = useStudio()
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
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
  )
}

/**
 * The floating journey navigator: application identity plus every level of the build, each with
 * its status and the fact it produced. Any level can be revisited. Compresses to icons on
 * narrower windows and to a top bar on the narrowest; the user can also collapse it.
 */
export function JourneyRail({
  project,
  active,
  mode,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onAllProjects,
}: {
  project: StudioProject | null
  active: StageId
  mode: RailMode
  /** Only meaningful when the window is wide enough for the full rail. */
  collapsed: boolean
  onToggleCollapsed?: () => void
  onSelect: (s: StageId) => void
  /** Back to the list of drafts (absent when there are none). */
  onAllProjects?: () => void
}) {
  const reduce = useReducedMotion()
  const done = project ? STAGES.filter((s) => project.progress[s] === 'complete').length : 0
  const currentIndex = STAGES.indexOf(active)
  const lifecycle = project ? lifecycleOf(project) : null
  const full = mode === 'full'
  const bar = mode === 'bar'

  const lifecycleBadge = lifecycle && (
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
  )

  return (
    <motion.nav
      aria-label="Studio stages"
      initial={reduce ? false : { opacity: 0, x: bar ? 0 : -16, y: bar ? -10 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={cn(
        'liquid-glass absolute z-30 flex rounded-[26px]',
        bar ? 'top-2 right-2 left-2 max-w-[calc(100%-1rem)] flex-col gap-1.5 overflow-hidden p-2' : 'top-3 left-3 max-h-[calc(100%-1.5rem)] flex-col overflow-y-auto',
        mode === 'icons' && 'w-[4.25rem] items-center gap-1 px-1.5 py-2.5',
        full && 'w-[15.5rem] p-3',
      )}
    >
      {onAllProjects && (full || bar) && (
        <button
          type="button"
          onClick={onAllProjects}
          aria-label="All projects"
          className={cn('-mt-0.5 mb-1.5 flex w-fit items-center gap-0.5 rounded-md text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50', bar && 'hidden')}
        >
          <ChevronLeft aria-hidden className="size-3.5" />
          All projects
        </button>
      )}
      {onAllProjects && mode === 'icons' && (
        <button
          type="button"
          onClick={onAllProjects}
          aria-label="All projects"
          title="All projects"
          className="mb-1 flex size-8 items-center justify-center rounded-xl text-muted-foreground outline-none hover:bg-white/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {/* Identity */}
      <div className={cn('flex items-center gap-2.5', full && 'mb-3', mode === 'icons' && 'mb-1 flex-col')}>
        <ProgressRing done={done} total={STAGES.length} current={currentIndex + 1} />
        {(full || bar) && (
          <div className="min-w-0 flex-1 space-y-0.5">
            {project ? <ProjectName project={project} /> : <p className="text-sm font-semibold">New application</p>}
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Level {currentIndex + 1} of {STAGES.length}
            </p>
          </div>
        )}
        {bar && lifecycleBadge}
        {onToggleCollapsed && (full || collapsed) && (
          <button
            type="button"
            aria-label={collapsed ? 'Expand journey' : 'Collapse journey'}
            onClick={onToggleCollapsed}
            className="flex size-7 shrink-0 items-center justify-center self-start rounded-lg text-muted-foreground outline-none hover:bg-white/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {/* Levels */}
      <ol className={cn('relative', bar ? 'no-scrollbar flex items-center justify-between gap-0.5 overflow-x-auto' : 'flex flex-col gap-0.5')}>
        {STAGES.map((stage, i) => {
          const progress = project?.progress[stage] ?? 'not-started'
          const current = stage === active
          const Icon = stageMeta[stage].icon
          const outcome = stageOutcome(project, stage)
          const nextDone = i < STAGES.length - 1 && progress === 'complete'
          return (
            <li key={stage} className="relative">
              {!bar && i < STAGES.length - 1 && (
                <span aria-hidden className={cn('absolute top-[2.45rem] z-0 h-[calc(100%-2.1rem)] w-0.5 overflow-hidden rounded-full bg-studio-ink/10', full ? 'left-[1.3rem]' : 'left-1/2 -translate-x-1/2')}>
                  <motion.span className="block w-full bg-primary" initial={false} animate={{ height: nextDone ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelect(stage)}
                aria-current={current ? 'step' : undefined}
                aria-label={`${i + 1}. ${stageMeta[stage].label} — ${current ? 'current, ' : ''}${statusLabel[progress]}`}
                title={full ? undefined : stageMeta[stage].label}
                className={cn('group relative z-10 flex w-full items-center gap-2.5 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50', full ? 'min-h-11 p-1.5' : 'justify-center p-1')}
              >
                {current && <motion.span layoutId="journey-active" aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-white shadow-[0_6px_18px_-8px_oklch(0.35_0.1_235/0.5)]" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
                <span
                  aria-hidden
                  className={cn(
                    'relative flex size-8 shrink-0 items-center justify-center rounded-[11px] transition-colors [&_svg]:size-4',
                    current && 'bg-primary text-primary-foreground',
                    !current && progress === 'complete' && 'bg-accent text-accent-foreground',
                    !current && progress === 'needs-review' && 'bg-warning-soft text-warning-ink ring-1 ring-warning',
                    !current && progress === 'not-started' && 'bg-white/70 text-muted-foreground group-hover:bg-white group-hover:text-foreground',
                  )}
                >
                  {current && <span className="studio-pulse absolute inset-0 rounded-[11px] bg-primary/40" />}
                  <Icon className="relative" />
                  {progress === 'complete' && current && (
                    <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white">
                      <Check className="!size-2" strokeWidth={4} />
                    </span>
                  )}
                  {progress === 'needs-review' && current && (
                    <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-warning text-foreground ring-2 ring-white">
                      <AlertTriangle className="!size-2" />
                    </span>
                  )}
                </span>
                {full && (
                  <span className="min-w-0 flex-1 text-left leading-tight">
                    <span className={cn('block text-[13px]', current ? 'font-semibold' : progress === 'not-started' ? 'text-muted-foreground' : 'font-medium')}>{stageMeta[stage].label}</span>
                    {(progress === 'needs-review' || outcome) && <span className={cn('block truncate text-[11px]', progress === 'needs-review' ? 'font-medium text-warning-ink' : 'text-muted-foreground')}>{progress === 'needs-review' ? 'Needs review' : outcome}</span>}
                  </span>
                )}
                {bar && current && <span className="pr-1.5 text-xs font-semibold whitespace-nowrap">{stageMeta[stage].label}</span>}
              </button>
            </li>
          )
        })}
      </ol>

      {full && project && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-studio-ink/10 pt-2.5">
          {lifecycleBadge}
          <SaveState />
        </div>
      )}
    </motion.nav>
  )
}
