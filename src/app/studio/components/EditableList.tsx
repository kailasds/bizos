import { useState } from 'react'
import { HelpCircle, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import type { SpecItem } from '@/app/blueprint/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const initials = (label: string) =>
  label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

/**
 * A requirement board the user can edit in place: each item is a chip with edit, remove and
 * "ask the architect" on hover or focus. The description is on the chip's tooltip. Stable ids.
 */
export function EditableList({
  title,
  items,
  onChange,
  onAsk,
  addLabel,
  idPrefix,
  emptyText,
  icon: Icon,
  avatars,
  className,
  bare,
}: {
  title: string
  items: SpecItem[]
  onChange: (items: SpecItem[]) => void
  onAsk?: (item: SpecItem) => void
  addLabel: string
  idPrefix: string
  emptyText: string
  icon?: LucideIcon
  /** Render items with initials — for groups of people. */
  avatars?: boolean
  className?: string
  /** No card of its own — the parent draws the surface. */
  bare?: boolean
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')

  const saveEdit = () => {
    const label = editText.trim()
    if (label && editingId) onChange(items.map((i) => (i.id === editingId ? { ...i, label } : i)))
    setEditingId(null)
  }

  const add = () => {
    const label = newText.trim()
    if (label) {
      const next = items.reduce((m, i) => Math.max(m, Number(i.id.split('-').pop()) || 0), 0) + 1
      onChange([...items, { id: `usr-${idPrefix}-${next}`, label }])
    }
    setNewText('')
    setAdding(false)
  }

  return (
    <section aria-label={title} className={cn(!bare && 'studio-card rounded-[22px] p-4', className)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && (
          <span aria-hidden className="flex size-7 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
            <Icon className="size-3.5" />
          </span>
        )}
        {title}
        <span className="ml-auto text-xs font-medium text-muted-foreground tabular-nums">{items.length}</span>
      </h3>
      {items.length === 0 && <p className="mb-2 text-sm text-muted-foreground">{emptyText}</p>}
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.id} className={cn(editingId === item.id && 'w-full')}>
            {editingId === item.id ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveEdit()
                }}
              >
                <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} aria-label={`Edit ${item.label}`} onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)} />
                <Button type="submit" size="sm">
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div title={item.description} className="group flex min-h-8 items-center gap-1.5 rounded-xl border border-studio-ink/10 bg-white py-1 pr-1 pl-2.5 text-[13px] leading-tight">
                {avatars && (
                  <span aria-hidden className="-ml-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                    {initials(item.label)}
                  </span>
                )}
                <span>{item.label}</span>
                <span className="flex w-0 gap-0.5 overflow-hidden group-focus-within:w-auto group-hover:w-auto [@media(hover:none)]:w-auto">
                  {onAsk && (
                    <Button size="icon-xs" variant="ghost" aria-label={`Ask the architect about ${item.label}`} onClick={() => onAsk(item)}>
                      <HelpCircle />
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Edit ${item.label}`}
                    onClick={() => {
                      setEditingId(item.id)
                      setEditText(item.label)
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label={`Remove ${item.label}`} onClick={() => onChange(items.filter((i) => i.id !== item.id))}>
                    <Trash2 />
                  </Button>
                </span>
              </div>
            )}
          </li>
        ))}
        <li className={cn(adding && 'w-full')}>
          {adding ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <Input autoFocus value={newText} onChange={(e) => setNewText(e.target.value)} placeholder={addLabel} aria-label={addLabel} onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} />
              <Button type="submit" size="sm" disabled={!newText.trim()}>
                Add
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <button
              type="button"
              aria-label={addLabel}
              title={addLabel}
              onClick={() => setAdding(true)}
              className="flex size-8 items-center justify-center rounded-xl border border-dashed border-studio-ink/25 text-muted-foreground outline-none hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" />
            </button>
          )}
        </li>
      </ul>
    </section>
  )
}
