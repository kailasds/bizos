import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, ChevronDown, Sparkles, X } from 'lucide-react'
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
  const [showGuidance, setShowGuidance] = useState(true)
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
    <aside aria-label="AI Architect" className="flex h-full min-h-0 w-full flex-col border-l bg-chrome">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <Sparkles aria-hidden className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">AI Architect</h2>
        <span className="text-xs text-muted-foreground">· {stageMeta[stage].label}</span>
        <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Close AI Architect" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="border-b">
        <button
          type="button"
          aria-expanded={showGuidance}
          onClick={() => setShowGuidance(!showGuidance)}
          className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium text-muted-foreground outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
        >
          What the OS is doing
          <ChevronDown aria-hidden className={cn('size-4', showGuidance && 'rotate-180')} />
        </button>
        {showGuidance && (
          <dl className="space-y-2 px-4 pb-3 text-sm">
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
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3" aria-live="polite">
        {log.length === 0 && <p className="text-xs text-muted-foreground">Ask about any decision on this stage.</p>}
        {log.map((m) =>
          m.role === 'user' ? (
            <p key={m.id} className="ml-6 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className="mr-2 space-y-2 rounded-lg border bg-card px-3 py-2">
              <p className="text-sm">{m.text}</p>
              {m.sources && m.sources.length > 0 && <p className="text-[11px] text-muted-foreground">Based on: {m.sources.join(' · ')}</p>}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.actions.map((a) => (
                    <Button key={a.label} size="xs" variant="outline" onClick={() => act(a)}>
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions(project, stage).map((p) => (
            <Button key={p} size="xs" variant="secondary" onClick={() => ask(p)}>
              {p}
            </Button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask the architect…" aria-label="Ask the AI Architect" />
          <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()}>
            <ArrowUp />
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">Scripted prototype responses. No AI model is called.</p>
      </div>
    </aside>
  )
}
