import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FolderOpen, X } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { appsInFolder, desktopShortcuts, folders } from '@/app/registry/applicationRegistry'
import type { AppDefinition, FolderDefinition } from '@/app/registry/types'
import { useApplications } from '@/app/registry/use-applications'
import { DesktopWidgets } from '@/app/widgets/DesktopWidgets'
import { AppIcon, AppTile } from '@/components/os/AppIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const countLabel = (n: number) => `${n} application${n === 1 ? '' : 's'}`

const previewIcon = 'size-14 rounded-2xl [&_svg]:size-6'

const TILE_RADIUS = 26
const TILE_W = 160
const TILE_H = 200
const CELL = 124
const GAP = 10
const PAD = 16
const HEADER = 58

/** Width and height of a folder, closed or open; content keeps fixed sizes so nothing reflows mid-animation. */
function folderSize(count: number, open: boolean) {
  if (!open) return { width: TILE_W, height: TILE_H }
  const cols = Math.min(Math.max(count, 2), 4)
  const rows = Math.max(1, Math.ceil(count / cols))
  return { width: count === 0 ? 300 : cols * CELL + (cols - 1) * GAP + 2 * PAD, height: Math.max(TILE_H, HEADER + rows * CELL + (rows - 1) * GAP + PAD) }
}

/**
 * A domain on the home screen: a glass folder previewing up to four of its applications. Opened, it
 * grows in place — sideways, pushing the folders after it — and shows its applications.
 */
function DomainFolder({ folder, apps, open, onToggle, onOpenApp, onOpenFolder, onCreate }: { folder: FolderDefinition; apps: AppDefinition[]; open: boolean; onToggle: (open: boolean) => void; onOpenApp: (app: AppDefinition) => void; onOpenFolder: () => void; onCreate: () => void }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const tileRef = useRef<HTMLButtonElement>(null)
  const size = folderSize(apps.length, open)
  const overflow = apps.length > 4 ? apps.length - 3 : 0
  const shown = apps.slice(0, overflow ? 3 : 4)
  const fade = { duration: reduce ? 0 : 0.16 }
  const grow = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 280, damping: 32, mass: 0.9 }

  // Esc or a press anywhere else closes it; focus goes back to the folder.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle(false)
        tileRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, onToggle])

  return (
    <motion.div ref={ref} initial={false} animate={size} transition={grow} style={{ borderRadius: TILE_RADIUS }} className={cn('widget-glass relative shrink-0 overflow-hidden', open && 'z-10')}>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.section
            key="open"
            aria-label={`${folder.name} applications`}
            className="absolute top-0 left-0 flex flex-col"
            style={{ width: size.width, height: size.height, padding: PAD }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ...fade, delay: reduce ? 0 : 0.06 } }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
          >
            <div className="flex shrink-0 items-start gap-1" style={{ height: HEADER - PAD }}>
              <div className="min-w-0 flex-1 leading-tight">
                <h3 className="text-[15px] font-semibold">{folder.name}</h3>
                <p className="text-xs text-muted-foreground tabular-nums">{countLabel(apps.length)}</p>
              </div>
              <Button variant="ghost" size="icon-sm" className="hover:bg-white/40" aria-label={`Open ${folder.name} in Folders`} title="Open in Folders" onClick={onOpenFolder}>
                <FolderOpen />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-white/40"
                aria-label={`Close ${folder.name}`}
                onClick={() => {
                  onToggle(false)
                  tileRef.current?.focus()
                }}
              >
                <X />
              </Button>
            </div>
            {apps.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">No applications yet.</p>
                <Button size="sm" onClick={onCreate}>
                  Create application
                </Button>
              </div>
            ) : (
              <ul className="grid min-h-0 flex-1" style={{ gap: GAP, gridTemplateColumns: `repeat(${Math.min(Math.max(apps.length, 2), 4)}, ${CELL}px)`, gridAutoRows: CELL }}>
                {apps.map((app, i) => (
                  <motion.li
                    key={app.id}
                    initial={reduce ? false : { opacity: 0, scale: 0.86, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30, delay: reduce ? 0 : 0.05 + i * 0.04 }}
                  >
                    <AppTile app={app} onClick={() => onOpenApp(app)} />
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>
        ) : (
          <motion.button
            key="closed"
            ref={tileRef}
            type="button"
            onClick={() => onToggle(true)}
            aria-expanded={false}
            aria-label={`${folder.name}, folder, ${countLabel(apps.length)}`}
            className="absolute top-0 left-0 flex flex-col justify-between p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset"
            style={{ width: TILE_W, height: TILE_H, borderRadius: TILE_RADIUS }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ...fade, delay: reduce ? 0 : 0.12 } }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.08 } }}
          >
            <span aria-hidden className="grid grid-cols-2 gap-2">
              {shown.map((app) => (
                <AppIcon key={app.id} app={app} variant="soft" className={previewIcon} />
              ))}
              {overflow > 0 && <span className="flex size-14 items-center justify-center rounded-2xl border border-white/50 bg-white/30 text-sm font-semibold tabular-nums">+{overflow}</span>}
              {Array.from({ length: Math.max(0, 4 - shown.length - (overflow ? 1 : 0)) }, (_, i) => (
                <span key={i} className="size-14 rounded-2xl border border-white/30 bg-white/10" />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{folder.name}</span>
              <span className="block text-xs text-muted-foreground tabular-nums">{countLabel(apps.length)}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** A platform tool: not an application of any domain, so it stands alone. */
function ToolCard({ app, onOpen }: { app: AppDefinition; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${app.name}, application`}
        className="widget-glass flex h-full w-full items-center gap-3 rounded-[22px] p-3 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none"
      >
        <AppIcon app={app} size="md" className="size-11 rounded-[14px]" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{app.name}</span>
          <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">{app.tagline ?? app.description}</span>
        </span>
      </button>
    </li>
  )
}

/** Newly published applications lead, so a fresh app shows in the domain's preview. */
const newestFirst = (list: AppDefinition[]) => [...list].sort((a, b) => (b.generated?.publishedAt ?? '').localeCompare(a.generated?.publishedAt ?? ''))

const sectionTitle = 'px-1 text-sm font-semibold text-[var(--wallpaper-ink)]'

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()
  const [openId, setOpenId] = useState<FolderDefinition['id'] | null>(null)
  const appsOf = (f: FolderDefinition) => newestFirst(appsInFolder(f.id, apps))
  // Application Studio is reached from the "+" menu and the dock, so it isn't repeated here.
  const tools = desktopShortcuts(apps).filter((a) => a.domains.length === 0 && a.id !== 'application-studio')
  const run = (action: () => void) => {
    setOpenId(null)
    action()
  }

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-9 md:overflow-y-auto md:pr-2 md:no-scrollbar">
        <section aria-label="Domains" className="space-y-3">
          <h2 className={sectionTitle}>Applications</h2>
          <div className="flex flex-wrap items-start gap-4">
            {folders.map((f) => (
              <DomainFolder
                key={f.id}
                folder={f}
                apps={appsOf(f)}
                open={openId === f.id}
                onToggle={(next) => setOpenId((cur) => (next ? f.id : cur === f.id ? null : cur))}
                onOpenApp={(app) => run(() => openApp(app.id))}
                onOpenFolder={() => run(() => openApp('folder-browser', { folder: f.id }))}
                onCreate={() => run(() => openApp('application-studio', { new: String(Date.now()) }))}
              />
            ))}
          </div>
        </section>

        <section aria-label="Platform tools" className="space-y-3">
          <h2 className={sectionTitle}>Platform tools</h2>
          <ul className="grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tools.map((app) => (
              <ToolCard key={app.id} app={app} onOpen={() => openApp(app.id)} />
            ))}
          </ul>
        </section>
      </div>

      <div className="md:no-scrollbar md:w-80 md:shrink-0 md:overflow-y-auto">
        <DesktopWidgets />
      </div>
    </div>
  )
}
