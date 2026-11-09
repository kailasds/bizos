import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DictationPhase } from '../hooks/use-dictation'

/** Live level bars: each bar breathes on its own rhythm; quieter while warming up. */
function Waveform({ loud }: { loud: boolean }) {
  const reduce = useReducedMotion()
  const bars = [0.55, 0.9, 0.7, 1, 0.6]
  return (
    <span aria-hidden className="flex h-4 items-center gap-[3px]">
      {bars.map((peak, i) => (
        <motion.span
          key={i}
          className="h-full w-[3px] origin-center rounded-full bg-current"
          initial={{ scaleY: 0.25 }}
          animate={reduce ? { scaleY: 0.5 } : { scaleY: loud ? [0.3, peak, 0.45, peak * 0.8, 0.3] : [0.2, 0.35, 0.2] }}
          transition={reduce ? { duration: 0 } : { duration: loud ? 0.9 + i * 0.13 : 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
        />
      ))}
    </span>
  )
}

/** The mic button. Listening, it widens into a pill with a live waveform, wrapped in a soft pulse. */
export function DictationButton({ phase, onStart, onStop }: { phase: DictationPhase; onStart: () => void; onStop: () => void }) {
  const reduce = useReducedMotion()
  const active = phase !== 'idle'
  return (
    <div className="relative">
      <AnimatePresence>
        {active && !reduce && (
          <motion.span key="pulse" aria-hidden className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[0, 0.9].map((delay) => (
              <motion.span
                key={delay}
                className="absolute inset-0 rounded-full bg-primary/25"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        layout
        onClick={active ? onStop : onStart}
        aria-pressed={active}
        aria-label={active ? 'Stop dictation' : 'Dictate'}
        title={active ? 'Stop dictation' : 'Dictate'}
        transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
        className={cn(
          'relative flex h-8 items-center justify-center gap-2 overflow-hidden rounded-full text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          active ? 'bg-primary px-3 text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]' : 'w-8 bg-white/60 text-muted-foreground hover:bg-white hover:text-foreground',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {active ? (
            <motion.span key="on" className="flex items-center gap-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              <Waveform loud={phase === 'speaking'} />
              <span className="whitespace-nowrap">{phase === 'listening' ? 'Listening…' : 'Hearing you'}</span>
              <Square aria-hidden className="size-3 fill-current" />
            </motion.span>
          ) : (
            <motion.span key="off" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.16 }}>
              <Mic aria-hidden className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className="sr-only" aria-live="polite">
        {phase === 'listening' ? 'Listening' : phase === 'speaking' ? 'Dictating' : ''}
      </span>
    </div>
  )
}
