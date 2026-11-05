import { useCallback, useEffect, useRef, useState } from 'react'

export interface SimulationState {
  running: boolean
  /** Index of the step in progress; equals steps.length when finished. */
  step: number
}

/**
 * Plays a fixed sequence of named steps with a delay each, then calls `onDone`.
 * Used for every simulated "the OS is working" moment. Cancels on unmount.
 */
export function useSimulation(stepMs = 650) {
  const [state, setState] = useState<SimulationState>({ running: false, step: 0 })
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const run = useCallback(
    (steps: number, onDone: () => void) => {
      if (timer.current) window.clearTimeout(timer.current)
      setState({ running: true, step: 0 })
      const tick = (i: number) => {
        timer.current = window.setTimeout(() => {
          if (i + 1 >= steps) {
            setState({ running: false, step: steps })
            onDone()
          } else {
            setState({ running: true, step: i + 1 })
            tick(i + 1)
          }
        }, stepMs)
      }
      tick(0)
    },
    [stepMs],
  )

  const reset = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    setState({ running: false, step: 0 })
  }, [])

  return { ...state, run, reset }
}
