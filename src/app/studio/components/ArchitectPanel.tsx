import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUp, ChevronDown, Compass, Sparkles, X } from 'lucide-react'
import { architectReply, stageGuidance, suggestedQuestions } from '@/app/services/mock/architecture-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import type { ArchitectAction, ArchitectMessage, StageId } from '../types'
import { useStudio } from '../use-studio'

/** The floating call button for the AI Architect. */
export function ArchitectOrb({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="AI Architect"
          aria-pressed={open}
          onClick={onToggle}
          className="liquid-glass absolute right-3 bottom-3 z-30 flex size-[3.25rem] items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span aria-hidden className="studio-orbit absolute inset-1 rounded-full border border-dashed border-primary/35" />
          <span aria-hidden className={cn('flex size-9 items-center justify-center rounded-full text-white', 'bg-primary')}>
            {open ? <X className="size-4" /> : <Sparkles className="size-4" />}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">AI Architect</TooltipContent>
    </Tooltip>
  )
}

/**
 * Contextual AI Architect. Knows the stage and the application being designed; replies
 * are scripted from project state (see services/mock/architecture-service.ts) — no
 * model is called. Each reply says what it is based on.
 */
export function ArchitectPanel({
  stage,
  onClose,
  onFocusOption,
}: {
  stage: StageId
  onClose: () => void
  /** Show an approach in Architect without selecting it. */
  onFocusOption: (optionId: string) => void
}) {
  const { project, dispatch } = useStudio()
  const [draft, setDraft] = useState('')
  const [showGuidance, setShowGuidance] = useState(false)
  const [localLog, setLocalLog] = useState<ArchitectMessage[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const guidance = stageGuidance(project, stage)
  const log = project ? project.architectLog.filter((m) => m.stage === stage) : localLog

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [log.length])

  const ask = (text: string) => {
    const question = text.trim()
    if (!question) return
    const reply = architectReply(project, stage, question)
    if (project) {
      dispatch({ type: 'architect/message', message: { role: 'user', stage, text: question } })
      dispatch({ type: 'architect/message', message: { role: 'architect', stage, text: reply.text, sources: reply.sources, actions: reply.actions } })
    } else {
      setLocalLog((l) => [
        ...l,
        { id: `local-${l.length}`, role: 'user', stage, text: question },
        { id: `local-${l.length + 1}`, role: 'architect', stage, text: reply.text, sources: reply.sources },
      ])
    }
    setDraft('')
  }

  const act = (a: ArchitectAction) => {
    if (a.kind === 'focus-option' && a.optionId) {
      onFocusOption(a.optionId)
      dispatch({ type: 'stage/go', stage: 'architect' })
    } else if (a.kind === 'go-stage' && a.stage) {
      dispatch({ type: 'stage/go', stage: a.stage })
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <motion.aside
      aria-label="AI Architect"
      initial={{ opacity: 0, scale: 0.92, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{ transformOrigin: 'bottom right' }}
      className="liquid-glass absolute right-3 bottom-[4.5rem] z-30 flex max-h-[calc(100%-6rem)] min-h-[24rem] w-[23rem] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[28px] !bg-white/80"
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="text-sm font-semibold">AI Architect</h2>
          <p className="text-xs text-muted-foreground">{stageMeta[stage].label}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close AI Architect" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="mx-3 mb-2 rounded-2xl bg-accent/70 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={showGuidance}
          onClick={() => setShowGuidance(!showGuidance)}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-accent-foreground outline-none focus-visible:underline"
        >
          <span className="flex items-center gap-1.5">
            <Compass aria-hidden className="size-3.5" />
            What the OS is doing
          </span>
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', showGuidance && 'rotate-180')} />
        </button>
        {showGuidance ? (
          <dl className="mt-2 space-y-2 text-sm">
            {(
              [
                ['Doing', guidance.doing],
                ['Why', guidance.why],
                ['Needs from you', guidance.needs],
                ['Next', guidance.next],
              ] as const
            ).map(([label, text]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn(label === 'Needs from you' && 'font-medium')}>{text}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 line-clamp-2 text-sm font-medium">{guidance.needs}</p>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2" aria-live="polite">
        {log.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-studio-ink px-3 py-2 text-sm text-white">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="min-w-0 space-y-2 rounded-2xl rounded-tl-md bg-white/80 px-3 py-2">
              <p className="text-sm leading-relaxed">{m.text}</p>
              {m.sources && m.sources.length > 0 && <p className="text-[11px] text-muted-foreground">Based on: {m.sources.join(' · ')}</p>}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.actions.map((a) => (
                    <Button key={a.label} size="xs" variant="outline" className="bg-card" onClick={() => act(a)}>
                      {a.label}
                      <ArrowRight />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions(project, stage).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => ask(p)}
              className="rounded-full border border-white bg-white/70 px-2.5 py-1 text-left text-xs outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-1 rounded-full border border-white bg-white/90 p-1 focus-within:ring-3 focus-within:ring-ring/40">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask the architect…" aria-label="Ask the AI Architect" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()} className="rounded-full bg-primary hover:bg-primary/90">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </motion.aside>
  )
}
