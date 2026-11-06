import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import type { AppId } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { getResource, resourceUsage } from '@/app/services/mock/resource-discovery-service'
import { useStudio } from '@/app/studio/use-studio'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { availabilityLabel, resourceKindLabel, type PlatformResource, type ResourceAvailability } from '@/data/resources.mock'

const availabilityTone: Record<ResourceAvailability, StatusTone> = {
  available: 'success',
  restricted: 'warning',
  validating: 'info',
  planned: 'neutral',
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Reusable resource detail: business-facing information first, technical metadata on
 * request. `resource` may be a snapshot (e.g. a composed worker); catalogue data wins.
 */
export function ResourceDetailSheet({
  resource,
  onOpenChange,
  context,
  actions,
}: {
  resource: PlatformResource | null
  onOpenChange: (open: boolean) => void
  /** e.g. the workflow steps this resource supports in the current application. */
  context?: { label: string; items: string[] }
  actions?: ReactNode
}) {
  const apps = useApplications()
  const { state } = useStudio()
  const { openApp } = useOs()
  const r = resource ? { ...resource, ...(getResource(resource.id) ?? {}) } : null
  const usage = r ? resourceUsage(r.id, apps, state.projects) : []

  return (
    <Sheet open={Boolean(r)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {r && (
          <>
            <SheetHeader className="border-b px-5 py-4">
              <p className="text-xs text-muted-foreground">
                {resourceKindLabel[r.kind]} · managed by {r.owner}
              </p>
              <SheetTitle className="text-lg">{r.name}</SheetTitle>
              <SheetDescription>{r.purpose || r.note}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={availabilityTone[r.availability]}>{availabilityLabel[r.availability]}</StatusBadge>
                <span className="text-xs text-muted-foreground tabular-nums">Version {r.version}</span>
              </div>
            </SheetHeader>

            <div className="space-y-5 px-5 py-4 text-sm">
              {context && context.items.length > 0 && (
                <Block title={context.label}>
                  <p>{context.items.join(' · ')}</p>
                </Block>
              )}
              {r.responsibilities?.length > 0 && (
                <Block title="Business responsibilities">
                  <ul className="list-disc space-y-1 pl-4">
                    {r.responsibilities.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </Block>
              )}
              {(r.availability !== 'available' || r.configuration) && (
                <Block title="Conditions">
                  <p>{r.configuration ?? r.note}</p>
                </Block>
              )}
              {r.dependencies?.length > 0 && (
                <Block title="Depends on">
                  <p>{r.dependencies.join(' · ')}</p>
                </Block>
              )}
              <Block title="Used by">
                {usage.length === 0 ? (
                  <p className="text-muted-foreground">No application uses it yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {usage.map((u) => (
                      <li key={`${u.kind}-${u.appId ?? u.projectId}`} className="flex items-center justify-between gap-2">
                        <span>
                          {u.name} <span className="text-xs text-muted-foreground">· {u.kind === 'draft' ? 'Studio draft' : u.kind === 'published' ? 'published from Studio' : 'built-in'}</span>
                        </span>
                        {u.appId && (
                          <Button size="xs" variant="ghost" onClick={() => openApp(u.appId as AppId)}>
                            Open
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
              {r.runtime && (
                <Block title="Current activity">
                  <p>
                    {r.runtime.state === 'busy' ? 'Busy' : r.runtime.state === 'validating' ? 'In validation' : 'Idle'}
                    {r.runtime.currentTask ? ` — ${r.runtime.currentTask}` : ''}
                  </p>
                </Block>
              )}

              <Collapsible className="rounded-lg border">
                <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50">
                  Technical details
                  <ChevronDown aria-hidden className="size-4 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 border-t px-3 py-2.5 text-xs">
                    <dt className="text-muted-foreground">Resource id</dt>
                    <dd className="tabular-nums">{r.id}</dd>
                    <dt className="text-muted-foreground">Endpoint</dt>
                    <dd className="break-all">{r.technical?.endpoint ?? '—'}</dd>
                    <dt className="text-muted-foreground">Capabilities</dt>
                    <dd>{r.capabilityIds.join(', ')}</dd>
                    <dt className="text-muted-foreground">Contract in</dt>
                    <dd>{r.technical?.contract.inputs.join(', ') || '—'}</dd>
                    <dt className="text-muted-foreground">Contract out</dt>
                    <dd>{r.technical?.contract.outputs.join(', ') || '—'}</dd>
                    {r.technical?.protocol && (
                      <>
                        <dt className="text-muted-foreground">Protocol</dt>
                        <dd>
                          {r.technical.protocol} · {r.technical.system}
                        </dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Last validated</dt>
                    <dd className="tabular-nums">{r.technical?.lastValidated ?? '—'}</dd>
                  </dl>
                </CollapsibleContent>
              </Collapsible>
              <p className="text-xs text-muted-foreground">
                The OS reads this record from {r.owner}; it does not manage the resource’s lifecycle.
              </p>
            </div>
            {actions && <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-popover px-5 py-3">{actions}</div>}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
