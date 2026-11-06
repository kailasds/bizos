import { useState } from 'react'
import { GitCompare, History, RotateCcw } from 'lucide-react'
import type { ApplicationBlueprint } from '@/app/blueprint/types'
import { sectionLabel } from '@/app/services/mock/blueprint-service'
import { StatusBadge } from '@/components/os/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { bumpVersion } from '@/app/blueprint/generate'
import type { BlueprintRevision, BlueprintSection } from '../types'
import { BlueprintDiff } from './BlueprintDiff'
import { BlueprintSummary } from './BlueprintSummary'

const kindLabel: Record<NonNullable<BlueprintRevision['kind']>, string> = {
  generated: 'Generated',
  regenerated: 'Regenerated',
  edit: 'Edited',
  rollback: 'Restored',
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ALL: BlueprintSection[] = ['overview', 'requirements', 'solution', 'workflow', 'resources', 'data', 'experience', 'security', 'deployment']

function Compare({ revisions }: { revisions: BlueprintRevision[] }) {
  const withSnap = revisions.filter((r) => r.snapshot)
  const [base, setBase] = useState(withSnap[1]?.version ?? withSnap[0]?.version ?? '')
  const [target, setTarget] = useState(withSnap[0]?.version ?? '')
  const a = withSnap.find((r) => r.version === base)?.snapshot
  const b = withSnap.find((r) => r.version === target)?.snapshot

  if (withSnap.length < 2) return <p className="text-sm text-muted-foreground">At least two versions with snapshots are needed to compare.</p>

  return (
    <section aria-label="Compare versions" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Compare</span>
        <NativeSelect size="sm" aria-label="Base version" value={base} onChange={(e) => setBase(e.target.value)}>
          {withSnap.map((r) => (
            <NativeSelectOption key={r.version} value={r.version}>
              v{r.version}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <span>with</span>
        <NativeSelect size="sm" aria-label="Target version" value={target} onChange={(e) => setTarget(e.target.value)}>
          {withSnap.map((r) => (
            <NativeSelectOption key={r.version} value={r.version}>
              v{r.version}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {base === target ? <p className="text-sm text-muted-foreground">Choose two different versions.</p> : a && b ? <BlueprintDiff before={a} after={b} /> : null}
    </section>
  )
}


/**
 * Frontend-only version history of a blueprint: what changed, why, which version is
 * published. Rollback restores old content as a new draft version — it never alters a
 * published application or any runtime.
 */
export function VersionHistory({
  revisions,
  publications,
  currentVersion,
  onRollback,
}: {
  revisions: BlueprintRevision[]
  publications: { version: string; publishedAt: string }[]
  currentVersion: string | null
  onRollback?: (version: string) => void
}) {
  const [viewing, setViewing] = useState<ApplicationBlueprint | null>(null)
  const [comparing, setComparing] = useState(false)
  const [restore, setRestore] = useState<BlueprintRevision | null>(null)
  const published = new Set(publications.map((p) => p.version))
  const live = publications[publications.length - 1]?.version

  if (revisions.length === 0) {
    return <p className="text-sm text-muted-foreground">No versions yet. A version is recorded each time the blueprint is generated or changed.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          {revisions.length} version{revisions.length === 1 ? '' : 's'}, newest first. Stored in this browser.
        </p>
        <Button size="sm" variant={comparing ? 'secondary' : 'outline'} aria-pressed={comparing} onClick={() => setComparing(!comparing)}>
          <GitCompare />
          Compare versions
        </Button>
      </div>
      {comparing && <Compare revisions={revisions} />}
      <ol className="divide-y rounded-lg border bg-card" aria-label="Blueprint versions">
        {revisions.map((r, i) => {
          const isCurrent = r.version === currentVersion && i === revisions.findIndex((x) => x.version === currentVersion)
          return (
            <li key={`${r.version}-${r.createdAt}`} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold tabular-nums">v{r.version}</span>
                {r.kind && <span className="text-xs text-muted-foreground">{kindLabel[r.kind]}</span>}
                <span className="text-xs text-muted-foreground tabular-nums">· {dateFormat.format(new Date(r.createdAt))}</span>
                <span className="ml-auto flex flex-wrap gap-1.5">
                  {r.version === live && <StatusBadge tone="success">Published</StatusBadge>}
                  {r.version !== live && published.has(r.version) && <StatusBadge tone="neutral">Previously published</StatusBadge>}
                  {isCurrent && <StatusBadge tone="info">Current draft</StatusBadge>}
                  {isCurrent && live && live !== r.version && <StatusBadge tone="warning">Pending changes</StatusBadge>}
                </span>
              </div>
              <p className="mt-1 text-sm">{r.summary}</p>
              {r.reason && <p className="text-xs text-muted-foreground">Why: {r.reason}</p>}
              {r.changedSections && r.changedSections.length > 0 && r.changedSections.length < ALL.length && (
                <p className="mt-1 text-xs text-muted-foreground">Changed: {r.changedSections.map((s) => sectionLabel[s]).join(', ')}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {r.snapshot ? (
                  <>
                    <Button size="xs" variant="ghost" onClick={() => setViewing(r.snapshot!)}>
                      <History />
                      View v{r.version}
                    </Button>
                    {onRollback && !isCurrent && (
                      <Button size="xs" variant="ghost" onClick={() => setRestore(r)}>
                        <RotateCcw />
                        Restore v{r.version}
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Recorded before version snapshots — content not available.</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <Sheet open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {viewing && (
            <>
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle>
                  {viewing.name} v{viewing.version}
                </SheetTitle>
                <SheetDescription>Read-only view of this version.</SheetDescription>
              </SheetHeader>
              <div className="px-5 py-4">
                <BlueprintSummary bp={viewing} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(restore)} onOpenChange={(o) => !o && setRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restore?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its content becomes a new draft version{currentVersion ? ` v${bumpVersion(currentVersion, 'patch')}` : ''}. Nothing is deleted — v{currentVersion} stays in the history.
              {live ? ` The published application (v${live}) does not change until you publish again.` : ''} Validation will need to run again. Rollback only changes the local state in your browser — no runtime is changed, and no platform or published version is touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restore) onRollback?.(restore.version)
                setRestore(null)
              }}
            >
              Restore as new draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
