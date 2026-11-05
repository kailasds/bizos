import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { listApps } from '@/app/registry/applicationRegistry'
import type { AppId, WindowParams } from '@/app/registry/types'
import { useMockServices } from '@/app/services/use-mock-services'
import { useStudio } from '@/app/studio/use-studio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { executions } from '@/data/platform.mock'
import type { Claim } from '@/data/claims.mock'
import { formatCurrency } from '@/data/claims.mock'
import { cn } from '@/lib/utils'

interface AssistantAction {
  label: string
  appId: AppId
  params?: WindowParams
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  actions?: AssistantAction[]
}

const suggestions = ['Create an application', 'What needs my approval?', 'What is running right now?', 'Why did something fail?', 'Open Document AI']

/**
 * Phase 1 assistant: deterministic, scripted responses over mock data.
 * No language model is called. Replace `respond` with the OS assistant service later.
 */
function respond(input: string, pending: Claim[], drafts: number): Omit<Message, 'id' | 'role'> {
  const q = input.toLowerCase()

  if (/(create|build|new app|generate|make an? app)/.test(q)) {
    return {
      text: `Opening Application Studio. Describe the business problem in your own words and I will design the application with you.${drafts ? ` You also have ${drafts} draft${drafts === 1 ? '' : 's'} you can reopen there.` : ''}`,
      actions: [{ label: 'Create application', appId: 'application-studio', params: { new: String(Date.now()) } }],
    }
  }

  const app = listApps().find(
    (a) => a.id !== 'folder-browser' && (q.includes(a.name.toLowerCase()) || q.includes(a.id.replace('-', ' '))),
  )
  if (app) {
    return { text: `Opening ${app.name}.`, actions: [{ label: `Open ${app.name}`, appId: app.id }] }
  }
  if (/(approv|decision|sign.?off)/.test(q)) {
    if (pending.length === 0) return { text: 'Nothing is waiting on you. All claim decisions are up to date.' }
    const list = pending.map((c) => `${c.id} (${formatCurrency(c.amount)}, ${c.product.toLowerCase()})`).join(', ')
    return {
      text: `${pending.length} claim${pending.length === 1 ? '' : 's'} await your decision: ${list}.`,
      actions: [{ label: 'Open approvals', appId: 'claims-intelligence', params: { view: 'approvals' } }],
    }
  }
  if (/(run|status|execut|happening|busy)/.test(q)) {
    const running = executions.filter((e) => e.state === 'running')
    return {
      text: `${running.length} workflows are running: ${running.map((e) => `${e.workflow} on ${e.subject} (${e.step})`).join('; ')}.`,
      actions: [{ label: 'View executions', appId: 'system-explorer', params: { section: 'workflows' } }],
    }
  }
  if (/(fail|error|broken|wrong)/.test(q)) {
    return {
      text: 'Execution EX-50198 (Document intake) failed at classification: DOC-7812 is password-protected, so no fields could be read. The customer needs to supply an unlocked copy.',
      actions: [{ label: 'Open DOC-7812', appId: 'document-ai', params: { doc: 'DOC-7812' } }],
    }
  }
  return {
    text: 'In this prototype I can create an application with you, open applications, summarise pending approvals, show what is running and explain failures. Try one of the suggestions below.',
  }
}

export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen, openApp } = useOs()
  const { pendingApprovals } = useMockServices()
  const studio = useStudio()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const nextId = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (assistantOpen) inputRef.current?.focus()
  }, [assistantOpen])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (!assistantOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssistantOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assistantOpen, setAssistantOpen])

  if (!assistantOpen) return null

  const ask = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const reply = respond(trimmed, pendingApprovals, studio.state.projects.length)
    setMessages((list) => [
      ...list,
      { id: nextId.current++, role: 'user', text: trimmed },
      { id: nextId.current++, role: 'assistant', ...reply },
    ])
    setDraft('')
    // Opening an app is the explicit intent of an "open X" request.
    if (reply.text.startsWith('Opening') && reply.actions?.[0]) {
      openApp(reply.actions[0].appId, reply.actions[0].params)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <aside
      aria-label="Assistant"
      className="pointer-events-auto absolute top-3 right-3 bottom-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden glass-strong rounded-2xl shadow-overlay animate-in fade-in-0 slide-in-from-right-2 [animation-duration:150ms]"
    >
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Assistant</h2>
        <span className="rounded-full border px-2 text-xs leading-5 text-muted-foreground">Scripted prototype</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}>
          <X />
        </Button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">How can I help?</p>
            <p className="text-sm text-muted-foreground">
              Responses in Phase 1 are scripted from mock data — no AI model is called.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col gap-2', m.role === 'user' && 'items-end')}>
            <p
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              {m.text}
            </p>
            {m.actions && m.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {m.actions.map((a) => (
                  <Button key={a.label} size="sm" variant="outline" onClick={() => openApp(a.appId, a.params)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Button key={s} size="xs" variant="secondary" onClick={() => ask(s)}>
              {s}
            </Button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about applications or activity…"
            aria-label="Message the assistant"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()}>
            <ArrowUp />
          </Button>
        </form>
      </div>
    </aside>
  )
}
