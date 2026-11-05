import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** The one status treatment (design.md §8): soft pill, leading dot, text label. */
const statusBadgeVariants = cva(
  'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        danger: 'bg-danger-soft text-danger-ink',
        info: 'bg-info-soft text-info-ink',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

const dotVariants = cva('size-1.5 shrink-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
      info: 'bg-info',
      neutral: 'bg-muted-foreground/60',
    },
    pulse: { true: 'animate-pulse', false: '' },
  },
  defaultVariants: { tone: 'neutral', pulse: false },
})

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>

export function StatusBadge({
  tone,
  pulse = false,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone: StatusTone; pulse?: boolean }) {
  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      <span aria-hidden className={dotVariants({ tone, pulse })} />
      {children}
    </span>
  )
}
