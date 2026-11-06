import { useState, type FormEvent } from 'react'
import { FileText, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { transactionSchemas } from '@/data/runtime.mock'
import { nextTransactionId, submit, useRuntime } from '../store'
import type { RuntimeApp } from '../types'

/**
 * Starts a business transaction on a published application. Samples prefill realistic
 * data that deterministically exercises a path (approval, failure, routine decision).
 */
export function TransactionForm({ app, onSubmitted }: { app: RuntimeApp; onSubmitted: (executionId: string) => void }) {
  useRuntime()
  const schema = transactionSchemas[app.domain]
  const empty = () => ({ [schema.idField]: nextTransactionId(app.appId) }) as Record<string, string>
  const [fields, setFields] = useState<Record<string, string>>(empty)
  const [documents, setDocuments] = useState<string[]>([])
  const [docDraft, setDocDraft] = useState('')
  const [preset, setPreset] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applyPreset = (id: string) => {
    const p = schema.presets.find((x) => x.id === id)!
    setFields({ ...p.fields, [schema.idField]: fields[schema.idField] || nextTransactionId(app.appId) })
    setDocuments(p.documents)
    setPreset(id)
    setError(null)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const missing = schema.fields.filter((f) => f.type !== 'longtext' && !fields[f.id]?.trim()).map((f) => f.label)
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`)
    if (schema.amountField && Number.isNaN(Number(fields[schema.amountField]))) return setError('Enter the amount as a number.')
    const id = submit(app.appId, { fields, documents, submittedBy: 'You' })
    if (!id) return setError('This application is no longer registered.')
    setFields(empty())
    setDocuments([])
    setPreset(null)
    onSubmitted(id)
  }

  return (
    <form onSubmit={onSubmit} aria-label={schema.action} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{schema.action}</h3>
        <span className="text-sm text-muted-foreground tabular-nums">v{app.version}</span>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs text-muted-foreground">Samples</legend>
        <div className="grid gap-2 @xl:grid-cols-2">
          {schema.presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => applyPreset(p.id)}
              className="rounded-lg border bg-card px-3 py-2 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-accent/60"
            >
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-muted-foreground">{p.shows}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 @xl:grid-cols-2">
        {schema.fields.map((f) => (
          <div key={f.id} className={f.type === 'longtext' ? 'space-y-1 @xl:col-span-2' : 'space-y-1'}>
            <Label htmlFor={`txn-${f.id}`}>{f.label}</Label>
            {f.type === 'longtext' ? (
              <Textarea id={`txn-${f.id}`} value={fields[f.id] ?? ''} onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })} />
            ) : (
              <Input
                id={`txn-${f.id}`}
                type={f.type === 'date' ? 'date' : 'text'}
                inputMode={f.type === 'money' ? 'numeric' : undefined}
                placeholder={f.placeholder}
                value={fields[f.id] ?? ''}
                onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="txn-doc">Document references</Label>
        <div className="flex gap-2">
          <Input id="txn-doc" placeholder="e.g. repair-estimate.pdf" value={docDraft} onChange={(e) => setDocDraft(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            disabled={!docDraft.trim()}
            onClick={() => {
              setDocuments([...documents, docDraft.trim()])
              setDocDraft('')
            }}
          >
            Add
          </Button>
        </div>
        <ul aria-label="Attached documents" className="flex flex-wrap gap-1.5 pt-1">
          {documents.length === 0 && <li className="text-xs text-muted-foreground">No documents attached.</li>}
          {documents.map((d) => (
            <li key={d} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2 text-xs">
              <FileText aria-hidden className="size-3 text-muted-foreground" />
              {d}
              <button type="button" aria-label={`Remove ${d}`} className="rounded-full p-0.5 hover:bg-muted" onClick={() => setDocuments(documents.filter((x) => x !== d))}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      )}
      <Button type="submit">
        <Play /> Submit and start execution
      </Button>
    </form>
  )
}
