import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowRight, ArrowUp, ClipboardCheck, Loader, Plus, ScanText, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { listApps } from '@/app/registry/applicationRegistry'
import type { AppId, WindowParams } from '@/app/registry/types'
import { useMockServices } from '@/app/services/use-mock-services'
import { useStudio } from '@/app/studio/use-studio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getRuntimeState } from '@/app/runtime/store'
import type { Claim } from '@/data/claims.mock'
import { formatCurrency } from '@/data/claims.mock'

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
const suggestionIcon: Record<string, LucideIcon> = {
  'Create an application': Plus,
  'What needs my approval?': ClipboardCheck,
  'What is running right now?': Loader,
  'Why did something fail?': AlertTriangle,
  'Open Document AI': ScanText,
}

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
    const running = getRuntimeState().executions.filter((e) => e.status === 'running' || e.status === 'queued' || e.status === 'waiting-approval')
    return {
      text: running.length
        ? `${running.length} execution${running.length === 1 ? ' is' : 's are'} in progress: ${running.map((e) => `${e.transaction.id} in ${e.appName} (${e.status === 'waiting-approval' ? 'waiting for approval' : e.steps[e.current]?.name})`).join('; ')}.`
        : 'No executions are in progress. Submit a transaction from a published application to start one.',
      actions: [{ label: 'Open Operations', appId: 'operations', params: { section: 'executions' } }],
    }
  }
  if (/(fail|error|broken|wrong)/.test(q)) {
    return {
      text: 'Execution EX-50198 (Document intake) failed at classification: DOC-7812 is password-protected, so no fields could be read. The customer needs to supply an unlocked copy.',
      actions: [{ label: 'Open DOC-7812', appId: 'document-ai', params: { doc: 'DOC-7812' } }],
    }
  }
  return {
    text: 'I can create an application with you, open applications, summarise pending approvals, show what is running and explain failures. Try one of the suggestions below.',
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
      className="pointer-events-auto absolute top-3 right-3 bottom-3 flex w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden glass-strong rounded-2xl shadow-overlay animate-in fade-in-0 slide-in-from-right-2 [animation-duration:150ms]"
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <h2 className="flex-1 text-sm font-semibold">Assistant</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}>
          <X />
        </Button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-4 pt-6">
            <div className="text-center">
              <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Sparkles className="size-6" />
              </span>
              <p className="mt-3 text-base font-semibold">How can I help?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((s) => {
                const Icon = suggestionIcon[s] ?? Sparkles
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="flex flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left text-sm outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 last:col-span-2"
                  >
                    <Icon aria-hidden className="size-4 text-primary" />
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Sparkles className="size-3" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="rounded-2xl rounded-tl-md bg-card px-3 py-2 text-sm leading-relaxed shadow-[0_1px_2px_oklch(0.2_0.02_220/0.08)]">{m.text}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <Button key={a.label} size="xs" variant="outline" className="bg-card" onClick={() => openApp(a.appId, a.params)}>
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
        {messages.length > 0 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="shrink-0 rounded-full border bg-card px-2.5 py-1 text-xs outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex items-center gap-1 rounded-xl border bg-card p-1 focus-within:ring-3 focus-within:ring-ring/40">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about applications or activity…"
            aria-label="Message the assistant"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()} className="rounded-lg">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </aside>
  )
}
