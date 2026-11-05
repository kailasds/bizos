import { useState, type FormEvent } from 'react'
import { AlertTriangle, Cpu, FileText, Settings2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { ApplicationBlueprint, DataEntity, DataField, ExperienceComponent, SampleRecord } from '@/app/blueprint/types'
import { SidebarNav } from '@/components/os/SidebarNav'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useAppRecords } from '@/app/services/app-records-store'
import { FieldValue } from './fields'

type Patch = (id: string, values: Partial<SampleRecord>) => void

interface Ctx {
  blueprint: ApplicationBlueprint
  entity: DataEntity
  records: SampleRecord[]
  selectedId: string | null
  select: (id: string) => void
  patch: Patch
  add: (record: SampleRecord) => void
}

const fieldOf = (entity: DataEntity, id: string): DataField | undefined => entity.fields.find((f) => f.id === id)

function MissingField({ id }: { id: string }) {
  return (
    <p className="flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs text-warning-ink">
      <AlertTriangle aria-hidden className="size-3.5" />“{id}” is not in the data model
    </p>
  )
}

function Queue({
  ctx,
  title,
  columns,
  rows,
  empty,
}: {
  ctx: Ctx
  title: string
  columns: string[]
  rows: SampleRecord[]
  empty: string
}) {
  const titleField = ctx.entity.titleField
  return (
    <section aria-label={title} className="min-w-0">
      <h4 className="mb-2 text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground tabular-nums">· {rows.length}</span>
      </h4>
      {rows.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-8">
          <EmptyHeader>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>{empty}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-chrome text-left text-xs text-muted-foreground">
              <tr className="border-b">
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                    {fieldOf(ctx.entity, c)?.label ?? c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => ctx.select(r.id)}
                  aria-selected={r.id === ctx.selectedId}
                  className={cn(
                    'cursor-pointer border-b last:border-0',
                    r.id === ctx.selectedId ? 'bg-accent' : 'hover:bg-muted/60',
                  )}
                >
                  {columns.map((c) => {
                    const field = fieldOf(ctx.entity, c)
                    return (
                      <td key={c} className="px-3 py-2">
                        {!field ? (
                          <MissingField id={c} />
                        ) : c === titleField ? (
                          <button
                            type="button"
                            className="text-left font-medium outline-none focus-visible:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              ctx.select(r.id)
                            }}
                          >
                            {String(r[c])}
                            <span className="block text-xs font-normal text-muted-foreground tabular-nums">{r.id}</span>
                          </button>
                        ) : (
                          <FieldValue field={field} value={r[c]} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const actorIcon = { automated: Cpu, system: Settings2, human: User }

function Detail({ ctx, component }: { ctx: Ctx; component: Extract<ExperienceComponent, { type: 'record-detail' }> }) {
  const record = ctx.records.find((r) => r.id === ctx.selectedId)
  if (!record) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        Select a {ctx.entity.name.toLowerCase()} to see its details.
      </p>
    )
  }
  return (
    <section aria-label={`${ctx.entity.name} details`} className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-xs text-muted-foreground tabular-nums">{record.id}</p>
        <h4 className="text-base font-semibold">{String(record[ctx.entity.titleField])}</h4>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {component.fields.map((id) => {
          const field = fieldOf(ctx.entity, id)
          return (
            <div key={id} className={cn(field?.type === 'longtext' && 'col-span-2')}>
              <dt className="text-xs text-muted-foreground">{field?.label ?? id}</dt>
              <dd className="text-sm">{field ? <FieldValue field={field} value={record[id]} /> : <MissingField id={id} />}</dd>
            </div>
          )
        })}
      </dl>
      {component.showWorkflow && (
        <div>
          <h5 className="mb-1.5 text-xs font-medium text-muted-foreground">Workflow</h5>
          <ol className="space-y-1">
            {ctx.blueprint.workflow.nodes.map((n, i) => {
              const Icon = actorIcon[n.actor]
              return (
                <li key={n.id} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <Icon aria-hidden className="size-3.5 text-muted-foreground" />
                  {n.name}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

function Notes({ ctx, component }: { ctx: Ctx; component: Extract<ExperienceComponent, { type: 'notes-panel' }> }) {
  const field = fieldOf(ctx.entity, component.field)
  const record = ctx.records.find((r) => r.id === ctx.selectedId)
  const [draft, setDraft] = useState('')
  if (!field) {
    return (
      <section aria-label={component.title} className="rounded-lg border border-warning/40 bg-warning-soft/40 p-4">
        <h4 className="text-sm font-semibold">{component.title}</h4>
        <p className="mt-1 text-sm text-warning-ink">
          This panel is bound to “{component.field}”, which the {ctx.entity.name} record does not have. Nothing can be saved here
          yet.
        </p>
      </section>
    )
  }
  if (!record) return null
  return (
    <section aria-label={component.title} className="rounded-lg border p-4">
      <h4 className="mb-2 text-sm font-semibold">{component.title}</h4>
      {record[field.id] && (
        <p className="mb-2 rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{String(record[field.id])}</p>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          ctx.patch(record.id, {
            [field.id]: [record[field.id], draft.trim()].filter(Boolean).join('\n'),
          })
          setDraft('')
          toast.success('Note saved', {
            description: 'Mock record — saved in this browser.',
          })
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Record a finding…"
          aria-label={component.title}
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Save note
        </Button>
      </form>
    </section>
  )
}

function Approvals({ ctx, component }: { ctx: Ctx; component: Extract<ExperienceComponent, { type: 'approval-queue' }> }) {
  const status = fieldOf(ctx.entity, 'status')
  const options = status?.options ?? []
  const done = options.find((o) => o.tone === 'success')?.value
  const referred = options.find((o) => o.tone === 'warning' && o.value !== component.statusValue)?.value ?? options[0]?.value
  const rows = ctx.records.filter((r) => r.status === component.statusValue)
  return (
    <section aria-label={component.title} className="min-w-0">
      <h4 className="mb-2 text-sm font-semibold">
        {component.title} <span className="font-normal text-muted-foreground tabular-nums">· {rows.length}</span>
      </h4>
      {rows.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-8">
          <EmptyHeader>
            <EmptyTitle>No decisions waiting</EmptyTitle>
            <EmptyDescription>Everything that needs approval has been decided.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{String(r[ctx.entity.titleField])}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">{r.id}</span>
                  {component.columns
                    .filter((c) => c !== ctx.entity.titleField)
                    .map((c) => {
                      const f = fieldOf(ctx.entity, c)
                      return f ? <FieldValue key={c} field={f} value={r[c]} /> : null
                    })}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (done) ctx.patch(r.id, { status: done })
                  toast.success(`${r.id} approved`, {
                    description: 'Mock decision — saved in this browser.',
                  })
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (referred) ctx.patch(r.id, { status: referred })
                  toast(`${r.id} referred`, {
                    description: 'Mock decision — saved in this browser.',
                  })
                }}
              >
                Refer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function IntakeForm({
  ctx,
  component,
  onCreated,
}: {
  ctx: Ctx
  component: Extract<ExperienceComponent, { type: 'intake-form' }>
  onCreated: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const fields = component.fields.map((id) => fieldOf(ctx.entity, id)).filter((f): f is DataField => Boolean(f))
  const titleMissing = !values[ctx.entity.titleField]?.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (titleMissing) return
    const status = fieldOf(ctx.entity, 'status')?.options?.[0]?.value ?? 'new'
    const id = `NEW-${String(ctx.records.length + 1).padStart(3, '0')}`
    const record: SampleRecord = { id, status }
    for (const f of fields) {
      const v = values[f.id]?.trim()
      if (v) record[f.id] = f.type === 'money' ? Number(v) || 0 : v
    }
    ctx.add(record)
    ctx.select(id)
    setValues({})
    toast.success(`${ctx.entity.name} ${id} created`, {
      description: 'Mock record — saved in this browser.',
    })
    onCreated()
  }

  return (
    <form onSubmit={submit} aria-label={component.title} className="max-w-xl space-y-4 rounded-lg border p-4">
      <h4 className="text-sm font-semibold">{component.title}</h4>
      {fields.map((f) => {
        const id = `intake-${f.id}`
        return (
          <div key={f.id}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">
              {f.label}
              {f.id === ctx.entity.titleField && <span className="text-muted-foreground"> (required)</span>}
            </label>
            {f.type === 'longtext' ? (
              <Textarea
                id={id}
                value={values[f.id] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            ) : (
              <Input
                id={id}
                inputMode={f.type === 'money' ? 'decimal' : undefined}
                value={values[f.id] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
          </div>
        )
      })}
      <Button type="submit" disabled={titleMissing}>
        Submit
      </Button>
    </form>
  )
}

/**
 * Renders an application from its blueprint using only trusted catalogue components.
 * No code is generated: pages and components are data, interpreted here.
 */
export function ExperienceRenderer({
  blueprint,
  initialRecords,
  persistKey,
}: {
  blueprint: ApplicationBlueprint
  initialRecords: SampleRecord[]
  /** Published applications persist their (mock) records under their app id; previews do not. */
  persistKey?: string
}) {
  const pages = blueprint.experience.pages
  const [pageId, setPageId] = useState(pages[0]?.id ?? '')
  const [localRecords, setLocalRecords] = useState<SampleRecord[]>(initialRecords)
  const [storedRecords, setStoredRecords] = useAppRecords(persistKey ?? '__preview__', initialRecords)
  const records = persistKey ? storedRecords : localRecords
  const setRecords = (fn: (list: SampleRecord[]) => SampleRecord[]) => (persistKey ? setStoredRecords(fn) : setLocalRecords(fn))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const entity = blueprint.dataModel.entities.find((e) => e.id === blueprint.dataModel.primaryEntity)!
  const page = pages.find((p) => p.id === pageId) ?? pages[0]

  if (!page) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyTitle>No screens in this blueprint</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  const ctx: Ctx = {
    blueprint,
    entity,
    records,
    selectedId,
    select: setSelectedId,
    patch: (id, values) => setRecords((list) => list.map((r) => (r.id === id ? ({ ...r, ...values } as SampleRecord) : r))),
    add: (record) => setRecords((list) => [record, ...list]),
  }

  const lists = page.components.filter((c) => c.type === 'work-queue' || c.type === 'approval-queue' || c.type === 'intake-form')
  const side = page.components.filter((c) => c.type === 'record-detail' || c.type === 'notes-panel')

  const render = (c: ExperienceComponent) => {
    switch (c.type) {
      case 'work-queue': {
        const rows = c.filter ? records.filter((r) => c.filter!.values.includes(String(r[c.filter!.field]))) : records
        return (
          <Queue
            key={c.id}
            ctx={ctx}
            title={c.title}
            columns={c.columns}
            rows={rows}
            empty={`No ${entity.pluralName.toLowerCase()} match this view.`}
          />
        )
      }
      case 'approval-queue':
        return <Approvals key={c.id} ctx={ctx} component={c} />
      case 'intake-form':
        return <IntakeForm key={c.id} ctx={ctx} component={c} onCreated={() => setPageId(pages[0].id)} />
      case 'record-detail':
        return <Detail key={c.id} ctx={ctx} component={c} />
      case 'notes-panel':
        return <Notes key={c.id} ctx={ctx} component={c} />
    }
  }

  return (
    <div className="@container h-full">
      <div className="flex h-full min-h-0 flex-col @3xl:flex-row">
        <SidebarNav
          label={`${blueprint.name} screens`}
          value={page.id}
          onChange={(id) => {
            setPageId(id)
            setSelectedId(null)
          }}
          items={pages.map((p) => ({
            id: p.id,
            label: p.title,
            icon: FileText,
          }))}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
          <h3 className="text-lg font-semibold">{page.title}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{page.purpose}</p>
          <div className={cn('grid gap-4', side.length > 0 && '@4xl:grid-cols-[minmax(0,1fr)_20rem]')}>
            <div className="min-w-0 space-y-4">{lists.map(render)}</div>
            {side.length > 0 && <div className="space-y-4">{side.map(render)}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
