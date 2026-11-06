import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Blocks,
  Check,
  CircleAlert,
  Globe2,
  LayoutPanelTop,
  ListChecks,
  MessageSquareQuote,
  MonitorCheck,
  Network,
  Plug,
  Puzzle,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ThoughtIcon, ThoughtLink } from '@/app/services/mock/thought-chain-service'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/** The single forward action on a screen. */
export const ctaClass = 'rounded-full bg-studio-cta px-4 text-white shadow-[0_8px_18px_-8px_var(--studio-cta)] hover:bg-studio-cta-hover disabled:shadow-none'

/** The graphite icon tile — the Studio's recurring anchor. */
export function IconTile({
  icon: Icon,
  size = 'md',
  tone = 'ink',
  className,
}: {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'ink' | 'soft' | 'person' | 'ai' | 'system' | 'danger' | 'warning' | 'success'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 items-center justify-center',
        size === 'sm' && 'size-7 rounded-[9px] [&_svg]:size-3.5',
        size === 'md' && 'size-9 rounded-xl [&_svg]:size-4',
        size === 'lg' && 'size-12 rounded-[15px] [&_svg]:size-5',
        size === 'xl' && 'size-16 rounded-[20px] [&_svg]:size-7',
        tone === 'ink' && 'bg-studio-ink text-studio-ink-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_6px_14px_-6px_var(--studio-ink)]',
        tone === 'soft' && 'bg-accent text-accent-foreground',
        tone === 'person' && 'bg-actor-person-soft text-[oklch(0.5_0.12_60)]',
        tone === 'ai' && 'bg-actor-ai-soft text-actor-ai',
        tone === 'system' && 'bg-actor-system-soft text-actor-system',
        tone === 'danger' && 'bg-danger-soft text-danger-ink',
        tone === 'warning' && 'bg-warning-soft text-warning-ink',
        tone === 'success' && 'bg-success-soft text-success-ink',
        className,
      )}
    >
      <Icon />
    </span>
  )
}

const linkIcon: Record<ThoughtIcon, LucideIcon> = {
  words: MessageSquareQuote,
  domain: Globe2,
  themes: Tags,
  capabilities: Puzzle,
  people: Users,
  rules: Scale,
  spec: ListChecks,
  approaches: Network,
  approach: Route,
  steps: Workflow,
  needs: Plug,
  found: Check,
  gap: CircleAlert,
  blueprint: Blocks,
  screens: LayoutPanelTop,
  checks: ShieldCheck,
  issues: CircleAlert,
  desktop: MonitorCheck,
}

/** How this level was reached: a compact chain of facts carried over from earlier levels. */
export function ThoughtStrip({ links, className }: { links: ThoughtLink[]; className?: string }) {
  if (links.length === 0) return null
  return (
    <ol aria-label="How this was reached" className={cn('flex flex-wrap items-center gap-y-1.5', className)}>
      {links.map((link, i) => {
        const Icon = linkIcon[link.icon]
        return (
          <li key={`${link.icon}-${link.label}`} className="flex items-center">
            {i > 0 && <ArrowRight aria-hidden className="mx-1 size-3 text-muted-foreground/60" />}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 py-0.5 pr-2.5 pl-1 text-xs',
                link.tone === 'danger' && 'bg-danger-soft/80 text-danger-ink',
                link.tone === 'warning' && 'bg-warning-soft/80 text-warning-ink',
                link.tone === 'success' && 'bg-success-soft/80 text-success-ink',
              )}
            >
              <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-white/80">
                <Icon className="size-3" />
              </span>
              <span className="max-w-44 truncate font-semibold tabular-nums">{link.value}</span>
              <span className="whitespace-nowrap opacity-75">{link.label}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export interface ThinkingProps {
  title: string
  label: string
  steps: string[]
  current: number
  /** A fact read from the project for each finished step. */
  results?: (string | undefined)[]
  failedAt?: number | null
  compact?: boolean
}

/** The chain of thought while the OS works: each link lights up in order and leaves its result. */
export function ThinkingChain({ title, label, steps, current, results, failedAt, compact }: ThinkingProps) {
  const reduce = useReducedMotion()
  return (
    <div aria-busy={failedAt == null} className="w-full">
      {!compact && (
        <div className="mb-5 flex items-center gap-4">
          <ThinkingOrb />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">{title}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Step {Math.min(current + 1, steps.length)} of {steps.length}
            </p>
          </div>
        </div>
      )}
      <ol aria-label={label} aria-live="polite">
        {steps.map((step, i) => {
          const state = failedAt != null ? (i < failedAt ? 'done' : i === failedAt ? 'failed' : 'waiting') : i < current ? 'done' : i === current ? 'active' : 'waiting'
          return (
            <motion.li
              key={step}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: state === 'waiting' ? 0.55 : 1, x: 0 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.04 }}
              className="relative flex gap-3 pb-3.5 last:pb-0"
            >
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-0.5 overflow-hidden rounded-full bg-studio-ink/10">
                  <motion.span className="block w-full bg-primary" initial={false} animate={{ height: state === 'done' ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
                </span>
              )}
              <span
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'active' && 'border-primary bg-white text-primary',
                  state === 'failed' && 'border-danger bg-danger text-white',
                  state === 'waiting' && 'border-studio-ink/15 bg-white/60 text-muted-foreground',
                )}
              >
                {state === 'active' && <span aria-hidden className="studio-pulse absolute inset-0 rounded-full bg-primary/40" />}
                {state === 'done' ? (
                  <Check aria-label="Done" className="size-3.5" />
                ) : state === 'active' ? (
                  <Spinner className="size-3.5" aria-label="In progress" />
                ) : state === 'failed' ? (
                  <X aria-label="Failed" className="size-3.5" />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
              </span>
              <span className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn('text-sm', state === 'active' && 'font-semibold', state === 'failed' && 'font-semibold text-danger-ink')}>{step}</span>
                {state === 'done' && results?.[i] && <span className="rounded-full bg-accent px-2 text-[11px] leading-5 font-medium text-accent-foreground">{results[i]}</span>}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

/** Animated core shown while the OS is working. */
export function ThinkingOrb({ size = 56 }: { size?: number }) {
  return (
    <span aria-hidden className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className="studio-orbit absolute inset-0 rounded-full border border-dashed border-primary/40" />
      <span className="studio-pulse absolute inset-2 rounded-full bg-primary/25" />
      <span className="absolute inset-[18%] flex items-center justify-center rounded-full bg-studio-ink text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]">
        <Sparkles className="size-4" />
      </span>
    </span>
  )
}

/** Full-canvas scrim hosting a ThinkingChain. */
export function ThinkingOverlay(props: ThinkingProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/25 p-4 pl-[var(--rail-offset)] backdrop-blur-[3px]">
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="liquid-glass w-full max-w-md rounded-[28px] p-6">
        <ThinkingChain {...props} />
      </motion.div>
    </div>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-xs font-semibold text-muted-foreground', className)}>{children}</h3>
}

/** Share of steps per actor. Counts only; never a percentage label. */
export function ActorBar({ people, ai, system, className }: { people: number; ai: number; system: number; className?: string }) {
  const parts = [
    { n: people, className: 'bg-actor-person' },
    { n: ai, className: 'bg-actor-ai' },
    { n: system, className: 'bg-actor-system' },
  ]
  return (
    <span aria-hidden className={cn('flex h-2 gap-0.5 overflow-hidden rounded-full', className)}>
      {parts.map((p, i) => p.n > 0 && <span key={i} className={cn('h-full rounded-[2px]', p.className)} style={{ flexGrow: p.n }} />)}
    </span>
  )
}
