import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppProps } from '@/app/registry/types'
import { useOs } from '@/app/os/use-os'
import { useParamsChange } from '@/app/windows/use-params-change'
import { StudioWindowScope } from './StudioWindowScope'
import { ArchitectOrb, ArchitectPanel } from './components/ArchitectPanel'
import { JourneyRail, type RailMode } from './components/JourneyRail'
import { StudioHeader } from './components/StudioHeader'
import { StudioHome } from './components/StudioHome'
import { ArchitectStage } from './stages/ArchitectStage'
import { ComposeStage } from './stages/ComposeStage'
import { DefineStage } from './stages/DefineStage'
import { DiscoverStage } from './stages/DiscoverStage'
import { GenerateStage, type GenerateTab } from './stages/GenerateStage'
import { PublishStage } from './stages/PublishStage'
import type { StageId } from './types'
import { useStudio } from './use-studio'

/** Rail layout follows the window, not the viewport. */
function useRailMode(collapsed: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1440, height: 900 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setSize({ width: el.clientWidth, height: el.clientHeight })
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const wide = size.width >= 1040
  const mode: RailMode = size.width < 720 ? 'bar' : wide && !collapsed ? 'full' : 'icons'
  return { ref, wide, mode, ...size }
}

/**
 * Application Studio — a full workspace hosted in an ordinary OS window. Stages fill a soft canvas;
 * the journey navigator, window actions and AI Architect float above it as liquid glass.
 * Params: `new` starts a new application; `project` reopens a draft.
 */
export function ApplicationStudioApp(props: AppProps) {
  const { state } = useStudio()
  // A window opened for new work starts empty; one opened from the dock resumes the last draft.
  const [initial] = useState(() => (props.params.project ? props.params.project : props.params.new ? null : state.activeProjectId))
  return (
    <StudioWindowScope initialProjectId={initial}>
      <StudioWindow {...props} />
    </StudioWindowScope>
  )
}

function StudioWindow({ windowId, params }: AppProps) {
  const { state, project, dispatch } = useStudio()
  const { setWindowContext } = useOs()
  useEffect(() => {
    setWindowContext(windowId, project?.name, project?.id)
  }, [windowId, project?.name, project?.id, setWindowContext])
  const [mode, setMode] = useState<'home' | 'new'>(params.new ? 'new' : 'home')
  const [panelOpen, setPanelOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [generateTab, setGenerateTab] = useState<GenerateTab>('overview')
  // The approach shown in Architect (not the selection) — the AI Architect can point at one.
  const [focusOptionId, setFocusOptionId] = useState<string | null>(null)
  const { ref, wide, mode: baseRailMode, width, height } = useRailMode(railCollapsed)

  // Deep links: the launcher, desktop and published apps open the studio with params.
  useEffect(() => {
    if (params.project) dispatch({ type: 'project/open', id: params.project })
    else if (params.new) dispatch({ type: 'project/close' })
  }, [params, dispatch])
  useParamsChange(params, (p) => {
    if (p.new) setMode('new')
  })

  const showHome = !project && mode === 'home' && state.projects.length > 0
  const stage: StageId = project?.activeStage ?? 'discover'
  // The Compose canvas needs the room on smaller windows, so the journey compresses to icons there.
  const railMode: RailMode = baseRailMode === 'full' && stage === 'compose' && width < 1280 ? 'icons' : baseRailMode

  const goTo = (target: StageId, tab?: GenerateTab) => {
    if (tab) setGenerateTab(tab)
    dispatch({ type: 'stage/go', stage: target })
  }

  const leftInset = railMode === 'bar' ? 16 : railMode === 'icons' ? 96 : 280
  const topInset = railMode === 'bar' ? 176 : 64
  const insets = { '--rail-offset': `${leftInset}px`, '--top-offset': `${topInset}px`, '--header-top': railMode === 'bar' && !showHome ? '130px' : '12px', '--center-gutter': railMode === 'bar' ? '0px' : wide ? '264px' : '84px' } as CSSProperties

  const content = () => {
    switch (stage) {
      case 'discover':
        return <DiscoverStage />
      case 'define':
        return <DefineStage openArchitect={() => setPanelOpen(true)} />
      case 'architect':
        return <ArchitectStage focusId={focusOptionId} onFocus={setFocusOptionId} />
      case 'compose':
        return <ComposeStage onFocusOption={setFocusOptionId} leftInset={leftInset} topInset={topInset} canvasWidth={width} canvasHeight={height} />
      case 'generate':
        return <GenerateStage tab={generateTab} onTabChange={setGenerateTab} />
      case 'publish':
        return <PublishStage windowId={windowId} goTo={goTo} />
    }
  }

  return (
    <div ref={ref} style={insets} className="theme-studio @container relative h-full min-h-0 overflow-hidden text-foreground [background:var(--studio-wash)]">
      <span aria-hidden className="studio-drift top-[-15%] left-[-8%] size-[34rem] bg-[radial-gradient(closest-side,oklch(0.82_0.06_225/0.5),transparent)]" />
      <span aria-hidden className="studio-drift right-[-6%] bottom-[-20%] size-[38rem] bg-[radial-gradient(closest-side,oklch(0.9_0.05_60/0.55),transparent)] [animation-delay:-12s]" />

      <StudioHeader home={showHome} />
      {showHome ? (
        <main className="relative h-full">
          <StudioHome
            onNew={() => {
              dispatch({ type: 'project/close' })
              setMode('new')
            }}
          />
        </main>
      ) : (
        <>
          <main className="relative h-full min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stage} className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {content()}
              </motion.div>
            </AnimatePresence>
          </main>
          <JourneyRail
            project={project}
            active={stage}
            mode={railMode}
            collapsed={railCollapsed}
            onToggleCollapsed={wide ? () => setRailCollapsed((v) => !v) : undefined}
            onSelect={(s) => project && goTo(s)}
            onAllProjects={
              state.projects.length > 0
                ? () => {
                    setMode('home')
                    dispatch({ type: 'project/close' })
                  }
                : undefined
            }
          />
          <ArchitectOrb open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} />
          <AnimatePresence>{panelOpen && <ArchitectPanel key="architect" stage={stage} onClose={() => setPanelOpen(false)} onFocusOption={setFocusOptionId} />}</AnimatePresence>
        </>
      )}
    </div>
  )
}
