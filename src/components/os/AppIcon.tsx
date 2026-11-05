import { cva } from 'class-variance-authority'
import { Folder } from 'lucide-react'
import { appsInFolder } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppTint, DomainId } from '@/app/registry/types'
import { cn } from '@/lib/utils'

const tintClass: Record<AppTint, string> = {
  blue: 'bg-tint-blue',
  teal: 'bg-tint-teal',
  amber: 'bg-tint-amber',
  coral: 'bg-tint-coral',
  graphite: 'bg-tint-graphite',
}

const iconVariants = cva('flex shrink-0 items-center justify-center text-white', {
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

/** Application identity: solid tinted squircle with a white lucide glyph. */
export function AppIcon({ app, size = 'md', className }: { app: AppDefinition; size?: IconSize; className?: string }) {
  const Icon = app.icon
  return (
    <span aria-hidden className={cn(iconVariants({ size }), tintClass[app.tint], className)}>
      <Icon />
    </span>
  )
}

/** Folder: a card squircle previewing up to four member app icons. */
export function FolderIcon({ folderId, size = 'lg', className }: { folderId: DomainId; size?: 'md' | 'lg'; className?: string }) {
  const members = appsInFolder(folderId).slice(0, 4)
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center border border-border bg-card shadow-widget',
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
