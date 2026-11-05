import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { architectReply, stageGuidance } from '../services/guidance'
import { stageMeta } from '../stageMeta'
import type { StageId } from '../types'
import { useStudio } from '../use-studio'

const prompts: Record<StageId, string[]> = {
  discover: ['What will you do with this?', 'Summarise progress'],
  define: ['What might be missing?', 'Summarise progress'],
  architect: ['Why do you recommend this?', 'Where do people review?'],
  compose: ['Why is a new worker needed?', 'Summarise progress'],
  generate: ['Where do people review?', 'Summarise progress'],
  validate: ['Summarise progress', 'What might be missing?'],
  publish: ['Summarise progress'],
}

/**
 * Contextual assistant. Always answers: what the OS is doing, why, what it needs,
 * and what happens next. Scripted responses — no model is called.
 */
export function ArchitectPanel({ stage, onClose }: { stage: StageId; onClose: () => void }) {
  const { project, dispatch } = useStudio()
  const [draft, setDraft] = useState('')
  const [localLog, setLocalLog] = useState<{ id: number; role: 'user' | 'architect'; text: string }[]>([])
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
      dispatch({ type: 'architect/message', message: { role: 'architect', stage, text: reply } })
    } else {
      setLocalLog((l) => [...l, { id: l.length, role: 'user', text: question }, { id: l.length + 1, role: 'architect', text: reply }])
    }
    setDraft('')
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

      <dl className="space-y-2.5 border-b px-4 py-3 text-sm">
        {(
          [
            ['Doing', guidance.doing],
            ['Why', guidance.why],
            ['Needs from you', guidance.needs],
            ['Next', guidance.next],
          ] as const
        ).map(([label, text]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className={cn(label === 'Needs from you' && 'font-medium')}>{text}</dd>
          </div>
        ))}
      </dl>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3" aria-live="polite">
        {log.length === 0 && <p className="text-xs text-muted-foreground">Ask about any decision on this stage.</p>}
        {log.map((m) => (
          <p
            key={m.id}
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              m.role === 'user' ? 'ml-6 bg-primary text-primary-foreground' : 'mr-2 border bg-card',
            )}
          >
            {m.text}
          </p>
        ))}
      </div>

      <div className="space-y-2 border-t p-3">
        <div className="flex flex-wrap gap-1.5">
          {prompts[stage].map((p) => (
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
