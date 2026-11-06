import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ChevronRight, Folder, Sparkles } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, desktopShortcuts, folders } from '@/app/registry/applicationRegistry'
import type { AppDefinition, AppTint } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { DesktopWidgets } from '@/app/widgets/DesktopWidgets'
import { AppIcon } from '@/components/os/AppIcon'
import { cn } from '@/lib/utils'

const VISIBLE = 3

const tileTint: Record<AppTint, string> = {
  blue: 'bg-tint-blue',
  teal: 'bg-tint-teal',
  amber: 'bg-tint-amber',
  coral: 'bg-tint-coral',
  graphite: 'bg-tint-graphite',
}

/** An app inside a domain: icon and name on the app's own colour. */
function DomainAppTile({ app, onOpen }: { app: AppDefinition; onOpen: () => void }) {
  const Icon = app.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${app.name}, application`}
      className={cn(
        'flex h-28 w-32 flex-col justify-between rounded-2xl p-3 text-left text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_6px_16px_-8px_oklch(0.2_0.03_220/0.5)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 active:translate-y-0',
        tileTint[app.tint],
      )}
    >
      <span aria-hidden className="flex size-9 items-center justify-center rounded-xl bg-white/20">
        <Icon className="size-5" />
      </span>
      <span className="line-clamp-2 text-sm leading-tight font-semibold">{app.name}</span>
    </button>
  )
}

/**
 * A domain as a group. Shows three apps; when it holds more, expanding animates the group open
 * to reveal the rest. The title opens the folder browser.
 */
function DomainGroup({ folder, apps, onOpenFolder, onOpenApp }: { folder: (typeof folders)[number]; apps: AppDefinition[]; onOpenFolder: () => void; onOpenApp: (app: AppDefinition) => void }) {
  const [expanded, setExpanded] = useState(false)
  const reduce = useReducedMotion()
  const extra = Math.max(0, apps.length - VISIBLE)
  const shown = expanded ? apps : apps.slice(0, VISIBLE)
  const transition = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34 }

  return (
    <motion.section layout transition={transition} aria-label={`${folder.name} folder`} className="glass-strong rounded-3xl p-3 shadow-widget">
      <motion.div layout="position" className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenFolder}
          aria-label={`${folder.name}, folder, ${apps.length} application${apps.length === 1 ? '' : 's'}`}
          className="group/folder flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-white/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Folder aria-hidden className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{folder.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{apps.length}</span>
          <ChevronRight aria-hidden className="size-4 text-muted-foreground/50 group-hover/folder:text-foreground" />
        </button>
        {extra > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary outline-none hover:bg-white/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {expanded ? 'Show less' : `Show all ${apps.length}`}
            <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </motion.div>
      {apps.length === 0 ? (
        <p className="px-1.5 pb-1 text-xs text-muted-foreground">No applications yet</p>
      ) : (
        <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${expanded ? Math.min(apps.length, 4) : Math.min(apps.length, VISIBLE)}, 8rem)` }}>
          <AnimatePresence initial={false}>
            {shown.map((app, i) => (
              <motion.li
                key={app.id}
                layout
                initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                transition={{ ...transition, delay: reduce || i < VISIBLE ? 0 : (i - VISIBLE) * 0.03 }}
              >
                <DomainAppTile app={app} onOpen={() => onOpenApp(app)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.section>
  )
}

/** A platform feature as a card with a one-line description. */
function FeatureCard({ icon, name, description, label, onOpen }: { icon: ReactNode; name: string; description: string; label: string; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="glass-strong flex h-full w-full items-center gap-3 rounded-2xl p-3 text-left shadow-widget outline-none hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {icon}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    </li>
  )
}

/** Newly published applications lead, so a fresh app is visible before the group is expanded. */
const newestFirst = (list: AppDefinition[]) =>
  [...list].sort((a, b) => (b.generated?.publishedAt ?? '').localeCompare(a.generated?.publishedAt ?? ''))

const oneLiner = (description: string) => description.split(/(?<=\.)\s|—/)[0].replace(/\.$/, '')

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()
  // Domain applications live in their domains; platform features are cards.
  const features = desktopShortcuts(apps).filter((a) => a.domains.length === 0)

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:overflow-y-auto md:pr-2 md:no-scrollbar">
        <button
          type="button"
          aria-label="Create Application, opens Application Studio"
          onClick={() => openApp('application-studio', { new: String(Date.now()) })}
          className="group/create flex max-w-xl items-center gap-4 rounded-3xl bg-primary px-5 py-4 text-left text-primary-foreground shadow-[0_10px_30px_-12px_oklch(0.45_0.14_250/0.8)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-white/70"
        >
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Create application</span>
            <span className="block truncate text-sm text-primary-foreground/80">Describe a business problem — the OS designs it</span>
          </span>
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-white text-primary transition-transform group-hover/create:translate-x-0.5">
            <ArrowRight className="size-4" />
          </span>
        </button>

        <section aria-label="Domains" className="space-y-2">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-foreground/70">Domains</h2>
          <div className="flex flex-wrap items-start gap-4">
            {folders.map((folder) => (
              <DomainGroup
                key={folder.id}
                folder={folder}
                apps={newestFirst(appsInFolder(folder.id, apps))}
                onOpenFolder={() => openApp('folder-browser', { folder: folder.id })}
                onOpenApp={(app) => openApp(app.id)}
              />
            ))}
          </div>
        </section>

        <ul aria-label="Platform" className="grid max-w-4xl gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
          {features.map((app) => (
            <FeatureCard key={app.id} label={`${app.name}, application`} name={app.name} description={app.tagline ?? oneLiner(app.description)} icon={<AppIcon app={app} size="md" className="size-11 rounded-xl" />} onOpen={() => openApp(app.id)} />
          ))}
        </ul>
      </div>

      <div className="md:no-scrollbar md:w-80 md:shrink-0 md:overflow-y-auto md:pb-12 md:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]">
        <DesktopWidgets />
      </div>
    </div>
  )
}
