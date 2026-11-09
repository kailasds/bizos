import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { StudioContext, type StudioContextValue } from './studio-context'
import type { StudioAction } from './studioReducer'
import { useStudio } from './use-studio'

/**
 * Gives one Studio window its own project, so several applications can be built side by side.
 * Drafts still live in the one shared store; this scope remembers which draft this window shows and
 * makes it the active draft before each action, so every reducer action lands on the right project.
 */
export function StudioWindowScope({ initialProjectId, children }: { initialProjectId: string | null; children: ReactNode }) {
  const base = useStudio()
  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const projectRef = useRef(projectId)
  const awaitingCreate = useRef(false)
  const baseDispatch = base.dispatch

  useEffect(() => {
    projectRef.current = projectId
  }, [projectId])

  // A draft created from this window becomes this window's draft.
  const activeId = base.state.activeProjectId
  useEffect(() => {
    if (awaitingCreate.current && activeId && activeId !== projectRef.current) {
      awaitingCreate.current = false
      setProjectId(activeId)
    }
  }, [activeId])

  const dispatch = useCallback(
    (action: StudioAction) => {
      switch (action.type) {
        case 'project/open':
          setProjectId(action.id)
          baseDispatch(action)
          return
        case 'project/close':
          setProjectId(null)
          baseDispatch(action)
          return
        case 'project/create':
          awaitingCreate.current = true
          baseDispatch(action)
          return
        case 'project/delete':
          if (action.id === projectRef.current) setProjectId(null)
          baseDispatch(action)
          return
        case 'improvement/apply':
          baseDispatch(action)
          return
        default:
          if (projectRef.current) baseDispatch({ type: 'project/open', id: projectRef.current })
          baseDispatch(action)
      }
    },
    [baseDispatch],
  )

  const value = useMemo<StudioContextValue>(
    () => ({ ...base, project: base.state.projects.find((p) => p.id === projectId) ?? null, dispatch }),
    [base, projectId, dispatch],
  )
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}
