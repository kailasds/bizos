import { useContext } from 'react'
import { OsContext } from './os-context'

export function useOs() {
  const ctx = useContext(OsContext)
  if (!ctx) throw new Error('useOs must be used inside <OsProvider>')
  return ctx
}
