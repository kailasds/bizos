import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUp, ChevronDown, Compass, MessageSquare, Sparkles, X } from 'lucide-react'
import { architectReply, stageGuidance, suggestedQuestions } from '@/app/services/mock/architecture-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { stageMeta } from '../stageMeta'
import type { ArchitectAction, ArchitectMessage, StageId } from '../types'
import { useStudio } from '../use-studio'

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
    <aside aria-label="AI Architect" className="flex h-full min-h-0 w-full flex-col border-l bg-card">
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
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

      <div className="mx-3 mb-2 rounded-xl bg-accent/70 px-3 py-2.5">
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
          <p className="mt-1.5 text-sm">
            <span className="text-xs text-muted-foreground">Needs from you · </span>
            <span className="font-medium">{guidance.needs}</span>
          </p>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2" aria-live="polite">
        {log.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground">
            <MessageSquare aria-hidden className="size-6" />
            <p className="text-xs">Ask about any decision on this stage.</p>
          </div>
        )}
        {log.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Sparkles className="size-3" />
              </span>
              <div className="min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-md bg-muted px-3 py-2">
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
            </div>
          ),
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions(project, stage).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => ask(p)}
              className="rounded-full border bg-card px-2.5 py-1 text-left text-xs text-foreground outline-none hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-1 rounded-xl border bg-card p-1 focus-within:ring-3 focus-within:ring-ring/40">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask the architect…" aria-label="Ask the AI Architect" className="border-0 shadow-none focus-visible:ring-0" />
          <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()} className="rounded-lg">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </aside>
  )
}
