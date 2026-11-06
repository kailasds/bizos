import { useEffect, useState } from 'react'
import type { AppProps } from '@/app/registry/types'
import { useParamsChange } from '@/app/windows/use-params-change'
import { cn } from '@/lib/utils'
import { ArchitectPanel } from './components/ArchitectPanel'
import { BuildLayers } from './components/BuildLayers'
import { StageNav } from './components/StageNav'
import { StudioHeader } from './components/StudioHeader'
import { StudioHome } from './components/StudioHome'
import { ArchitectStage } from './stages/ArchitectStage'
import { ComposeStage } from './stages/ComposeStage'
import { DefineStage } from './stages/DefineStage'
import { DiscoverStage } from './stages/DiscoverStage'
import { GenerateStage, type GenerateTab } from './stages/GenerateStage'
import { PublishStage } from './stages/PublishStage'
import { ValidateStage } from './stages/ValidateStage'
import type { StageId } from './types'
import { useStudio } from './use-studio'

/**
 * Application Studio — a full workspace hosted in an ordinary OS window.
 * Params: `new` starts a new application; `project` reopens a draft.
 */
export function ApplicationStudioApp({ windowId, params }: AppProps) {
  const { state, project, dispatch } = useStudio()
  const [mode, setMode] = useState<'home' | 'new'>(params.new ? 'new' : 'home')
  // Side panel: build layers beside the work on wide screens; the AI Architect opens on request.
  const [panel, setPanel] = useState<'layers' | 'ai' | null>(() => (window.innerWidth >= 1280 ? 'layers' : null))
  const toggle = (which: 'layers' | 'ai') => setPanel((p) => (p === which ? null : which))
  const [generateTab, setGenerateTab] = useState<GenerateTab>('overview')
  // The approach shown in Architect (not the selection) — the AI Architect can point at one.
  const [focusOptionId, setFocusOptionId] = useState<string | null>(null)

  // Deep links: the launcher, assistant, desktop and published apps open the studio with params.
  useEffect(() => {
    if (params.project) dispatch({ type: 'project/open', id: params.project })
    else if (params.new) dispatch({ type: 'project/close' })
  }, [params, dispatch])
  useParamsChange(params, (p) => {
    if (p.new) setMode('new')
  })

  const showHome = !project && mode === 'home' && state.projects.length > 0
  const stage: StageId = project?.activeStage ?? 'discover'

  const goTo = (target: StageId, tab?: GenerateTab) => {
    if (tab) setGenerateTab(tab)
    dispatch({ type: 'stage/go', stage: target })
  }

  const content = () => {
    switch (stage) {
      case 'discover':
        return <DiscoverStage />
      case 'define':
        return <DefineStage openArchitect={() => setPanel('ai')} />
      case 'architect':
        return <ArchitectStage focusId={focusOptionId} onFocus={setFocusOptionId} />
      case 'compose':
        return <ComposeStage onFocusOption={setFocusOptionId} />
      case 'generate':
        return <GenerateStage tab={generateTab} onTabChange={setGenerateTab} />
      case 'validate':
        return <ValidateStage goTo={goTo} />
      case 'publish':
        return <PublishStage windowId={windowId} />
    }
  }

  return (
    <div className="theme-studio @container flex h-full min-h-0 flex-col bg-background text-foreground">
      <StudioHeader
        windowId={windowId}
        panel={panel}
        onToggleLayers={() => toggle('layers')}
        onToggleArchitect={() => toggle('ai')}
        onAllProjects={() => {
          setMode('home')
          dispatch({ type: 'project/close' })
        }}
      />
      {showHome ? (
        <StudioHome
          onNew={() => {
            dispatch({ type: 'project/close' })
            setMode('new')
          }}
        />
      ) : (
        <>
          <StageNav project={project} active={stage} onSelect={(s) => project && goTo(s)} />
          <div className="relative flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 bg-background">{content()}</main>
            {panel && (
              <div className={cn('absolute inset-y-0 right-0 z-10 w-80 shadow-overlay @5xl:static @5xl:z-auto @5xl:shrink-0 @5xl:shadow-none')}>
                {panel === 'ai' ? (
                  <ArchitectPanel stage={stage} onClose={() => setPanel(null)} onFocusOption={setFocusOptionId} />
                ) : (
                  <BuildLayers active={stage} onClose={() => setPanel(null)} />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
