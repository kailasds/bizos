import { Minus, PenLine, Plus, type LucideIcon } from 'lucide-react'
import type { ApplicationBlueprint } from '@/app/blueprint/types'
import { changeKind, diffBlueprints, sectionLabel, type ChangeKind } from '@/app/services/mock/blueprint-service'
import { cn } from '@/lib/utils'
import type { BlueprintSection } from '../types'

const ALL: BlueprintSection[] = ['overview', 'requirements', 'solution', 'workflow', 'resources', 'data', 'experience', 'security', 'deployment']

const changeStyle: Record<ChangeKind, { icon: LucideIcon; row: string; ink: string }> = {
  added: { icon: Plus, row: 'border-success bg-success-soft/60', ink: 'text-success-ink' },
  removed: { icon: Minus, row: 'border-danger bg-danger-soft/60', ink: 'text-danger-ink' },
  changed: { icon: PenLine, row: 'border-info bg-info-soft/60', ink: 'text-info-ink' },
}

/** Section-by-section differences between two blueprint versions, each line highlighted by kind. */
export function BlueprintDiff({ before, after }: { before: ApplicationBlueprint; after: ApplicationBlueprint }) {
  const diff = diffBlueprints(before, after)
  const unchanged = ALL.filter((s) => !diff.some((d) => d.section === s))
  if (diff.length === 0) return <p className="text-sm">No differences between v{before.version} and v{after.version}.</p>
  return (
    <div className="space-y-3">
      <ul className="space-y-3" aria-label="Changed sections">
        {diff.map((d) => (
          <li key={d.section}>
            <h4 className="text-sm font-medium">{sectionLabel[d.section]}</h4>
            <ul className="mt-1.5 space-y-1 text-sm">
              {d.changes.map((c) => {
                const kind = changeKind(c)
                const Icon = changeStyle[kind].icon
                return (
                  <li key={c} data-change={kind} className={cn('flex items-start gap-2 rounded-md border-l-2 px-2 py-1', changeStyle[kind].row)}>
                    {/* The sentence already starts with Added / Removed / Changed, so the icon is decorative. */}
                    <Icon aria-hidden className={cn('mt-0.5 size-3.5 shrink-0', changeStyle[kind].ink)} />
                    <span className="min-w-0">{c}</span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Unchanged: {unchanged.map((s) => sectionLabel[s]).join(', ')}.</p>
    </div>
  )
}
