import { useState } from 'react'
import { Info, LayoutDashboard, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useOs } from '@/app/os/use-os'
import { useParamsChange } from '@/app/windows/use-params-change'
import type { AppProps } from '@/app/registry/types'
import { widgetOrder } from '@/app/widgets/widgetCatalog'
import { SidebarNav } from '@/components/os/SidebarNav'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

type Section = 'desktop' | 'about'

const sections = [
  { id: 'desktop' as const, label: 'Desktop', icon: LayoutDashboard },
  { id: 'about' as const, label: 'About', icon: Info },
]

function DesktopSettings() {
  const { widgetPreferences, setWidgetVisible, resetPreferences, closeAllWindows } = useOs()
  return (
    <div className="max-w-lg space-y-8">
      <section>
        <h3 className="text-lg font-semibold">Widgets</h3>
        <p className="text-sm text-muted-foreground">Choose what appears in the desktop's system overview.</p>
        <ul className="mt-4 divide-y rounded-lg border">
          {widgetOrder.map((w) => {
            const id = `widget-${w.id}`
            return (
              <li key={w.id} className="flex items-center gap-4 px-4 py-3">
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm font-medium">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">{w.description}</span>
                </label>
                <Switch id={id} checked={widgetPreferences[w.id]} onCheckedChange={(v) => setWidgetVisible(w.id, v)} />
              </li>
            )
          })}
        </ul>
      </section>
      <section>
        <h3 className="text-base font-semibold">Reset</h3>
        <p className="text-sm text-muted-foreground">Show every widget again. Open windows are not affected.</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => {
            resetPreferences()
            toast.success('Widget preferences reset')
          }}
        >
          <RotateCcw />
          Reset widgets
        </Button>
      </section>
      <section>
        <h3 className="text-base font-semibold">Windows</h3>
        <p className="text-sm text-muted-foreground">Close every open window, including this one.</p>
        <Button size="sm" variant="destructive" className="mt-3" onClick={closeAllWindows}>
          Close all windows
        </Button>
      </section>
    </div>
  )
}

function About() {
  return (
    <div className="max-w-lg space-y-4 text-sm">
      <h3 className="text-lg font-semibold">Enterprise AI OS</h3>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
        <dt className="text-muted-foreground">Release</dt>
        <dd>Phase 1 · Desktop foundation</dd>
        <dt className="text-muted-foreground">Data</dt>
        <dd>All applications, metrics and activity are mock data held in this browser session.</dd>
        <dt className="text-muted-foreground">Integrations</dt>
        <dd>None. Agent Control Plane, AI Workers Platform and connectors are not connected.</dd>
        <dt className="text-muted-foreground">Assistant</dt>
        <dd>Scripted responses. No AI model is called.</dd>
      </dl>
    </div>
  )
}

export function SettingsApp({ params }: AppProps) {
  const [section, setSection] = useState<Section>(params.section === 'about' ? 'about' : 'desktop')

  useParamsChange(params, (p) => {
    if (p.section === 'about' || p.section === 'desktop') setSection(p.section)
  })

  return (
    <div className="@container flex h-full min-h-0 flex-col @3xl:flex-row">
      <SidebarNav label="Settings" items={sections} value={section} onChange={setSection} />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">{section === 'desktop' ? <DesktopSettings /> : <About />}</div>
    </div>
  )
}
