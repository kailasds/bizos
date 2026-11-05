import { createContext, type Dispatch } from 'react'
import type { StudioAction, StudioState } from './studioReducer'
import type { StudioProject } from './types'

export type SaveStatus = 'saved' | 'saving' | 'unavailable'

export interface StudioContextValue {
  state: StudioState
  project: StudioProject | null
  dispatch: Dispatch<StudioAction>
  saveStatus: SaveStatus
  savedAt: string | null
}

export const StudioContext = createContext<StudioContextValue | null>(null)
