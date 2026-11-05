import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { StudioContext, type SaveStatus, type StudioContextValue } from './studio-context'
import { initialStudioState, studioReducer, type StudioState } from './studioReducer'

const STORAGE_KEY = 'enterprise-ai-os:studio:v1'

function loadState(): StudioState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialStudioState
    const parsed = JSON.parse(raw) as StudioState
    return Array.isArray(parsed.projects) ? parsed : initialStudioState
  } catch {
    return initialStudioState
  }
}

/**
 * Holds every Application Studio draft. Persists to local storage so drafts survive
 * a refresh; simulations (thinking, composing, validating, publishing) are never
 * persisted mid-flight, so a reload always lands on a stable state.
 */
export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, undefined, loadState)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaveStatus('saving')
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        setSaveStatus('saved')
        setSavedAt(new Date().toISOString())
      } catch {
        setSaveStatus('unavailable')
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [state])

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      project: state.projects.find((p) => p.id === state.activeProjectId) ?? null,
      dispatch,
      saveStatus,
      savedAt,
    }),
    [state, saveStatus, savedAt],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}
