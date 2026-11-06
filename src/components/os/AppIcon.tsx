import { cva } from 'class-variance-authority'
import { Folder } from 'lucide-react'
import { appsInFolder } from '@/app/registry/applicationRegistry'
import { useApplications } from '@/app/registry/use-applications'
import type { AppDefinition, AppTint, DomainId } from '@/app/registry/types'
import { cn } from '@/lib/utils'

const tintClass: Record<AppTint, string> = {
  blue: 'bg-tint-blue',
  teal: 'bg-tint-teal',
  amber: 'bg-tint-amber',
  coral: 'bg-tint-coral',
  graphite: 'bg-tint-graphite',
}

const iconVariants = cva('flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_1px_2px_oklch(0.2_0.03_220/0.2)]', {
  variants: {
    size: {
      xs: 'size-5 rounded-[5px] [&_svg]:size-3',
      sm: 'size-7 rounded-md [&_svg]:size-4',
      md: 'size-10 rounded-lg [&_svg]:size-5',
      lg: 'size-13 rounded-xl [&_svg]:size-6',
    },
  },
  defaultVariants: { size: 'md' },
})

type IconSize = 'xs' | 'sm' | 'md' | 'lg'

/** Soft style: tinted border, very dim fill, and a coloured, duotone-filled glyph. */
const softTint: Record<AppTint, string> = {
  blue: 'border-tint-blue/60 bg-[color-mix(in_oklab,var(--tint-blue)_12%,oklch(1_0_0/0.55))] text-tint-blue',
  teal: 'border-tint-teal/70 bg-[color-mix(in_oklab,var(--tint-teal)_12%,oklch(1_0_0/0.55))] text-[oklch(0.44_0.09_209)]',
  amber: 'border-tint-amber/75 bg-[color-mix(in_oklab,var(--tint-amber)_14%,oklch(1_0_0/0.55))] text-[oklch(0.56_0.13_75)]',
  coral: 'border-tint-coral/60 bg-[color-mix(in_oklab,var(--tint-coral)_12%,oklch(1_0_0/0.55))] text-tint-coral',
  graphite: 'border-tint-graphite/50 bg-[color-mix(in_oklab,var(--tint-graphite)_10%,oklch(1_0_0/0.55))] text-tint-graphite',
}
const softTintHover: Record<AppTint, string> = {
  blue: 'hover:bg-[color-mix(in_oklab,var(--tint-blue)_24%,oklch(1_0_0/0.6))]',
  teal: 'hover:bg-[color-mix(in_oklab,var(--tint-teal)_24%,oklch(1_0_0/0.6))]',
  amber: 'hover:bg-[color-mix(in_oklab,var(--tint-amber)_28%,oklch(1_0_0/0.6))]',
  coral: 'hover:bg-[color-mix(in_oklab,var(--tint-coral)_24%,oklch(1_0_0/0.6))]',
  graphite: 'hover:bg-[color-mix(in_oklab,var(--tint-graphite)_20%,oklch(1_0_0/0.6))]',
}
const softGlyph = 'fill-current/25 stroke-[2.25]'

/** Application identity: solid tinted squircle with a white lucide glyph. */
export function AppIcon({ app, size = 'md', variant = 'solid', className }: { app: AppDefinition; size?: IconSize; variant?: 'solid' | 'soft'; className?: string }) {
  const Icon = app.icon
  if (variant === 'soft') {
    return (
      <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-lg border', softTint[app.tint], className)}>
        <Icon className={softGlyph} />
      </span>
    )
  }
  return (
    <span aria-hidden className={cn(iconVariants({ size }), tintClass[app.tint], className)}>
      <Icon />
    </span>
  )
}

/** An application inside an open folder: icon and name share one softly tinted container. */
export function AppTile({ app, onClick }: { app: AppDefinition; onClick: () => void }) {
  const Icon = app.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${app.name}, application`}
      className={cn('flex size-full flex-col items-center justify-center gap-2 rounded-[22px] border p-2.5 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/60', softTint[app.tint], softTintHover[app.tint])}
    >
      <Icon aria-hidden className={cn('size-8', softGlyph)} />
      <span className="line-clamp-2 text-xs leading-tight font-semibold text-foreground">{app.name}</span>
    </button>
  )
}

/** Folder: a card squircle previewing up to four member app icons. */
export function FolderIcon({ folderId, size = 'lg', className }: { folderId: DomainId; size?: 'md' | 'lg'; className?: string }) {
  const members = appsInFolder(folderId, useApplications()).slice(0, 4)
  return (
    <span
      aria-hidden
      className={cn(
        'glass-strong flex shrink-0 items-center justify-center shadow-widget',
        size === 'lg' ? 'size-13 rounded-xl' : 'size-10 rounded-lg',
        className,
      )}
    >
      {members.length === 0 ? (
        <Folder className={cn('text-muted-foreground', size === 'lg' ? 'size-6' : 'size-5')} />
      ) : (
        <span className={cn('grid grid-cols-2', size === 'lg' ? 'gap-1' : 'gap-0.5')}>
          {members.map((app) => (
            <span
              key={app.id}
              className={cn(tintClass[app.tint], size === 'lg' ? 'size-4 rounded-[4px]' : 'size-3 rounded-[3px]')}
            />
          ))}
        </span>
      )}
    </span>
  )
}
