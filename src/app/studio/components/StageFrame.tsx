import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useStudio } from '../use-studio'
import { stageMeta } from '../stageMeta'
import type { StageId } from '../types'

/** Common stage layout: title, needs-review banner, scrollable body, sticky footer actions. */
export function StageFrame({
  stage,
  children,
  footer,
  aside,
}: {
  stage: StageId
  children: ReactNode
  footer?: ReactNode
  aside?: ReactNode
}) {
  const { project } = useStudio()
  const reason = project?.progress[stage] === 'needs-review' ? project.staleReasons[stage] : undefined
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-6">
          <header className="mb-6 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{stageMeta[stage].title}</h2>
            </div>
            {aside}
          </header>
          {reason && (
            <div role="status" className="mb-6 flex gap-2 rounded-lg border border-warning/40 bg-warning-soft/60 px-3 py-2 text-sm">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-ink" />
              <p>
                <span className="font-medium text-warning-ink">Needs review. </span>
                {reason} Check this stage and confirm it again.
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
      {footer && (
        <footer className="shrink-0 border-t bg-card">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-2 px-6 py-3">{footer}</div>
        </footer>
      )}
    </div>
  )
}

/** Shown when a stage is opened before the artifact it depends on exists. */
export function StagePrerequisite({ stage, requires, message }: { stage: StageId; requires: StageId; message: string }) {
  const { dispatch } = useStudio()
  return (
    <StageFrame stage={stage}>
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ArrowRight />
          </EmptyMedia>
          <EmptyTitle>Not ready yet</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'stage/go', stage: requires })}>
          Go to {stageMeta[requires].label}
        </Button>
      </Empty>
    </StageFrame>
  )
}
