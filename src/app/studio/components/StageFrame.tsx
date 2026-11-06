import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { thoughtChain } from '@/app/services/mock/thought-chain-service'
import { InfoTip } from '@/components/os/InfoTip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudio } from '../use-studio'
import { stageMeta } from '../stageMeta'
import { STAGES, type StageId } from '../types'
import { IconTile, ThinkingOverlay, ThoughtStrip, type ThinkingProps } from './StudioParts'

/** Floating action pill: one hint at most, then the way forward. */
export function ActionDock({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-20 flex justify-center pr-[4.75rem] pl-[var(--rail-offset)]">
      <div className="liquid-glass pointer-events-auto flex max-w-full flex-wrap items-center justify-end gap-2 rounded-[22px] p-1.5 pl-3 [&>[data-slot=button]]:h-auto [&>[data-slot=button]]:min-h-8 [&>[data-slot=button]]:py-1.5 [&>[data-slot=button]]:whitespace-normal [&>span]:text-[13px]">{children}</div>
    </div>
  )
}

function ReviewBanner({ reason }: { reason: string }) {
  return (
    <div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning-soft/80 px-3 py-2 text-sm">
      <AlertTriangle aria-hidden className="size-4 shrink-0 text-warning-ink" />
      <p>
        <span className="font-semibold text-warning-ink">Needs review. </span>
        {reason}
      </p>
    </div>
  )
}

/**
 * Common stage layout: level title and reasoning chain, scrollable content, a floating action
 * dock, and the thinking overlay while the OS works. `bleed` hands the whole canvas to the stage.
 */
export function StageFrame({
  stage,
  children,
  footer,
  aside,
  thinking,
  hideHeader,
  bleed,
}: {
  stage: StageId
  children: ReactNode
  footer?: ReactNode
  aside?: ReactNode
  thinking?: ThinkingProps | null
  hideHeader?: boolean
  bleed?: boolean
}) {
  const { project } = useStudio()
  const reason = project?.progress[stage] === 'needs-review' ? project.staleReasons[stage] : undefined
  const meta = stageMeta[stage]
  const links = thoughtChain(project, stage)

  const header = (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <IconTile icon={meta.icon} size="lg" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground tabular-nums">
          Level {STAGES.indexOf(stage) + 1} · {meta.label}
        </p>
        <div className="flex items-center gap-1">
          <h2 className="text-xl leading-tight font-semibold tracking-tight">{meta.title}</h2>
          <InfoTip label={`About ${meta.label}`}>{meta.description}</InfoTip>
        </div>
      </div>
      {aside && <div className="ml-auto">{aside}</div>}
    </header>
  )

  return (
    <div className="relative h-full min-h-0">
      {bleed ? (
        <>
          <div className="absolute inset-0">{children}</div>
          <div className="pointer-events-none absolute top-[var(--top-offset)] right-[var(--bleed-right,12px)] left-[var(--rail-offset)] z-10">
            <div className="flex w-fit max-w-full flex-col gap-2 [&>*]:max-w-full">
              <div className="pointer-events-auto">{header}</div>
              {links.length > 0 && <ThoughtStrip links={links} className="pointer-events-auto" />}
              {reason && (
                <div className="pointer-events-auto">
                  <ReviewBanner reason={reason} />
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className={cn('mx-auto flex min-h-full w-full max-w-[86rem] flex-col pt-[var(--top-offset)] pr-4 pl-[var(--rail-offset)] @3xl:pr-6', hideHeader ? 'pb-5 @3xl:pr-[4.75rem]' : 'pb-28')}>
            {hideHeader ? (
              <h2 className="sr-only">{meta.title}</h2>
            ) : (
              <div className="mb-5 space-y-3">
                {header}
                <ThoughtStrip links={links} />
              </div>
            )}
            {reason && <ReviewBanner reason={reason} />}
            {children}
          </div>
        </div>
      )}
      {footer && <ActionDock>{footer}</ActionDock>}
      {thinking && <ThinkingOverlay {...thinking} />}
    </div>
  )
}

/** Shown when a stage is opened before the artifact it depends on exists. */
export function StagePrerequisite({ stage, requires, message }: { stage: StageId; requires: StageId; message: string }) {
  const { dispatch } = useStudio()
  const Icon = stageMeta[requires].icon
  return (
    <StageFrame stage={stage}>
      <div className="studio-card mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-[28px] p-8 text-center">
        <IconTile icon={Icon} size="lg" />
        <p className="text-base font-semibold">Not ready yet</p>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => dispatch({ type: 'stage/go', stage: requires })}>
          Go to {stageMeta[requires].label}
          <ArrowRight />
        </Button>
      </div>
    </StageFrame>
  )
}
