import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Dialog as DialogPrimitive } from 'radix-ui'
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
const PANEL_RADIUS = 30
const CELL = 124
const GAP = 10
const PAD = 18
const HEADER = 66
const EDGE = 16

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** A domain on the home screen: a glass folder previewing up to four of its applications. */
function DomainTile({ folder, apps, hidden, onOpen }: { folder: FolderDefinition; apps: AppDefinition[]; hidden: boolean; onOpen: (from: DOMRect) => void }) {
  const overflow = apps.length > 4 ? apps.length - 3 : 0
  const shown = apps.slice(0, overflow ? 3 : 4)
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      aria-haspopup="dialog"
      aria-label={`${folder.name}, folder, ${countLabel(apps.length)}`}
      style={{ borderRadius: TILE_RADIUS }}
      className={cn('widget-glass flex w-40 flex-col gap-3 p-4 text-left outline-none transition-[opacity,transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none', hidden && 'opacity-0')}
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
    </button>
  )
}

/** Where the open folder settles: anchored to its tile, nudged only to stay on screen. */
function panelBox(from: DOMRect, count: number): { box: Box; cols: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const fit = Math.max(1, Math.floor((vw - 2 * EDGE - 2 * PAD + GAP) / (CELL + GAP)))
  const cols = Math.min(Math.max(count, 2), 4, fit)
  const rows = Math.max(1, Math.ceil(count / cols))
  const width = count === 0 ? 288 : cols * CELL + (cols - 1) * GAP + 2 * PAD
  const height = Math.min(count === 0 ? 176 : HEADER + rows * CELL + (rows - 1) * GAP + PAD, vh - 2 * EDGE)
  return {
    cols,
    box: {
      width,
      height,
      left: Math.max(EDGE, Math.min(from.left, vw - width - EDGE)),
      top: Math.max(EDGE, Math.min(from.top, vh - height - EDGE)),
    },
  }
}

/** The folder opened in place: it grows out of its tile while the rest of the screen blurs behind it. */
function ExpandedFolder({ open, folder, apps, from, onClose, onExited, onOpenApp, onOpenFolder, onCreate }: { open: boolean; folder: FolderDefinition | null; apps: AppDefinition[]; from: DOMRect | null; onClose: () => void; onExited: () => void; onOpenApp: (app: AppDefinition) => void; onOpenFolder: () => void; onCreate: () => void }) {
  const reduce = useReducedMotion()
  const tile: Box | null = from && { left: from.left, top: from.top, width: from.width, height: from.height }
  const layout = from ? panelBox(from, apps.length) : null
  const grow = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 34, mass: 0.9 }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence onExitComplete={onExited}>
        {open && folder && tile && layout && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-white/10 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="widget-glass folder-pane fixed z-50 overflow-hidden outline-none"
                initial={{ ...tile, borderRadius: TILE_RADIUS }}
                animate={{ ...layout.box, borderRadius: PANEL_RADIUS, transition: grow }}
                exit={{ ...tile, borderRadius: TILE_RADIUS, opacity: [1, 1, 0], transition: reduce ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.3, times: [0, 0.8, 1] } } }}
              >
                {/* Fixed-size content: the glass grows around it, so nothing reflows while it animates. */}
                <div style={{ width: layout.box.width, height: layout.box.height, padding: PAD }} className="flex flex-col">
                  <motion.div className="flex shrink-0 items-start gap-1" style={{ height: HEADER - PAD }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2, delay: reduce ? 0 : 0.08 }}>
                    <div className="min-w-0 flex-1 leading-tight">
                      <DialogPrimitive.Title className="text-[15px] font-semibold">{folder.name}</DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-xs text-muted-foreground tabular-nums">{countLabel(apps.length)}</DialogPrimitive.Description>
                    </div>
                    <Button variant="ghost" size="icon-sm" className="hover:bg-white/40" aria-label={`Open ${folder.name} in Folders`} title="Open in Folders" onClick={onOpenFolder}>
                      <FolderOpen />
                    </Button>
                    <DialogPrimitive.Close asChild>
                      <Button variant="ghost" size="icon-sm" className="hover:bg-white/40" aria-label="Close">
                        <X />
                      </Button>
                    </DialogPrimitive.Close>
                  </motion.div>
                  {apps.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">No applications in this domain yet.</p>
                      <Button size="sm" onClick={onCreate}>
                        Create application
                      </Button>
                    </div>
                  ) : (
                    <ul className="no-scrollbar grid min-h-0 flex-1 overflow-y-auto" style={{ gap: GAP, gridTemplateColumns: `repeat(${layout.cols}, ${CELL}px)`, gridAutoRows: CELL }}>
                      {apps.map((app, i) => (
                        <motion.li
                          key={app.id}
                          initial={reduce ? false : { opacity: 0, scale: 0.82, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: reduce ? 0 : 0.06 + i * 0.035 }}
                          style={{ transformOrigin: 'top left' }}
                        >
                          <AppTile app={app} onClick={() => onOpenApp(app)} />
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
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

const sectionTitle = 'px-1 text-sm font-semibold text-foreground/85'

export function DesktopCanvas() {
  const { openApp } = useOs()
  const apps = useApplications()
  const [expanded, setExpanded] = useState<{ id: FolderDefinition['id']; from: DOMRect } | null>(null)
  const [open, setOpen] = useState(false)
  const folder = folders.find((f) => f.id === expanded?.id) ?? null
  const appsOf = (f: FolderDefinition) => newestFirst(appsInFolder(f.id, apps))
  // Application Studio is reached from the "+" menu and the dock, so it isn't repeated here.
  const tools = desktopShortcuts(apps).filter((a) => a.domains.length === 0 && a.id !== 'application-studio')

  // The tile's position is only valid for this window size.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [open])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="absolute inset-0 isolate flex flex-col gap-8 overflow-y-auto p-6 md:flex-row md:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-9 md:overflow-y-auto md:pr-2 md:no-scrollbar">
        <section aria-label="Domains" className="space-y-3">
          <h2 className={sectionTitle}>Applications</h2>
          <div className="flex flex-wrap items-start gap-4">
            {folders.map((f) => (
              <DomainTile
                key={f.id}
                folder={f}
                apps={appsOf(f)}
                hidden={open && expanded?.id === f.id}
                onOpen={(from) => {
                  setExpanded({ id: f.id, from })
                  setOpen(true)
                }}
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

      <ExpandedFolder
        open={open}
        folder={folder}
        apps={folder ? appsOf(folder) : []}
        from={expanded?.from ?? null}
        onClose={() => setOpen(false)}
        onExited={() => setExpanded(null)}
        onOpenApp={(app) => run(() => openApp(app.id))}
        onOpenFolder={() => run(() => folder && openApp('folder-browser', { folder: folder.id }))}
        onCreate={() => run(() => openApp('application-studio', { new: String(Date.now()) }))}
      />
    </div>
  )
}
