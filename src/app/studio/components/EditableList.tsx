import { useState } from 'react'
import { HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import type { SpecItem } from '@/app/blueprint/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * A requirement list the user can edit in place: edit, remove, add, and ask the
 * architect to clarify an item. Items keep their stable ids.
 */
export function EditableList({
  title,
  items,
  onChange,
  onAsk,
  addLabel,
  idPrefix,
  emptyText,
}: {
  title: string
  items: SpecItem[]
  onChange: (items: SpecItem[]) => void
  onAsk?: (item: SpecItem) => void
  addLabel: string
  idPrefix: string
  emptyText: string
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
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 && <p className="mb-2 text-sm text-muted-foreground">{emptyText}</p>}
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((item) => (
          <li key={item.id} className="group flex items-start gap-2 px-3 py-2">
            {editingId === item.id ? (
              <form
                className="flex flex-1 gap-2"
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
              <>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-sm">{item.label}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-60 group-focus-within:opacity-100 group-hover:opacity-100">
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
                </div>
              </>
            )}
          </li>
        ))}
        <li className="px-3 py-2">
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
            <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => setAdding(true)}>
              <Plus />
              {addLabel}
            </Button>
          )}
        </li>
      </ul>
    </section>
  )
}
