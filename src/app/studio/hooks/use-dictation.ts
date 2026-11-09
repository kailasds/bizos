import { useCallback, useEffect, useRef, useState } from 'react'

export type DictationPhase = 'idle' | 'listening' | 'speaking'

/** Speaking pace: about 26 characters a second, with natural pauses after commas and full stops. */
const CHAR_MS = 38
const PAUSE_MS: Record<string, number> = { ',': 200, '.': 340, ';': 240 }
const WARM_UP_MS = 650
const SETTLE_MS = 700

/** When each character of a phrase is heard, from the start of speech. */
function timeline(text: string) {
  const at: number[] = []
  let t = 0
  for (const ch of text) {
    t += CHAR_MS * (ch === ' ' ? 0.6 : 1)
    at.push(t)
    t += PAUSE_MS[ch] ?? 0
  }
  return at
}

/**
 * Simulated voice dictation (no microphone is used): after a short "listening" warm-up, a scripted
 * phrase arrives at speaking pace, one character per frame budget, appended to whatever is already
 * written. Typing, pressing the button again or Esc stops it, keeping what has arrived.
 */
export function useDictation({ script, getBase, onText, onDone }: { script: () => string; getBase: () => string; onText: (text: string) => void; onDone?: () => void }) {
  const [phase, setPhase] = useState<DictationPhase>('idle')
  const frame = useRef<number | null>(null)
  const timer = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current)
    if (timer.current) window.clearTimeout(timer.current)
    frame.current = null
    timer.current = null
  }, [])

  const stop = useCallback(() => {
    clear()
    setPhase('idle')
  }, [clear])

  const start = useCallback(() => {
    clear()
    const base = getBase().trimEnd()
    const phrase = (base ? ' ' : '') + script()
    const at = timeline(phrase)
    setPhase('listening')
    timer.current = window.setTimeout(() => {
      setPhase('speaking')
      const t0 = performance.now()
      let shown = 0
      const tick = (now: number) => {
        const elapsed = now - t0
        let next = shown
        while (next < at.length && at[next] <= elapsed) next++
        if (next !== shown) {
          shown = next
          onText(base + phrase.slice(0, shown))
        }
        if (shown < at.length) {
          frame.current = requestAnimationFrame(tick)
        } else {
          timer.current = window.setTimeout(() => {
            setPhase('idle')
            onDone?.()
          }, SETTLE_MS)
        }
      }
      frame.current = requestAnimationFrame(tick)
    }, WARM_UP_MS)
  }, [clear, getBase, script, onText, onDone])

  useEffect(() => {
    if (phase === 'idle') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stop()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, stop])

  useEffect(() => clear, [clear])

  return { phase, active: phase !== 'idle', start, stop }
}
