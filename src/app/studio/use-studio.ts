import { useContext } from 'react'
import { StudioContext } from './studio-context'

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside <StudioProvider>')
  return ctx
}
