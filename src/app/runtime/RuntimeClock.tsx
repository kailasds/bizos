import { useEffect } from 'react'
import { tickRuntime } from './store'

/**
 * Drives the simulated runtime: advances executions whose next step is due. Runs for the
 * whole OS session (executions keep processing while their window is closed), and resumes
 * persisted in-flight executions after a reload.
 */
export function RuntimeClock() {
  useEffect(() => {
    tickRuntime()
    const id = window.setInterval(() => tickRuntime(), 300)
    return () => window.clearInterval(id)
  }, [])
  return null
}
