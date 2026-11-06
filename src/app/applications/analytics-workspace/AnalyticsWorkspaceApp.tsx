import { useState } from 'react'
import { MockBadge } from '@/components/os/MockBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { analytics, type DailyCount, type Period } from '@/data/analytics.mock'
import { cn } from '@/lib/utils'

const GRID_STEP = 20

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums" title={hint}>
        {value}
      </p>
      <p className="truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/** Single-series bar chart: one hue, 2px gaps, 4px rounded tops, per-bar tooltip. */
function DailyBars({ data }: { data: DailyCount[] }) {
  const max = Math.ceil(Math.max(...data.map((d) => d.value)) / GRID_STEP) * GRID_STEP
  const ticks = Array.from({ length: max / GRID_STEP + 1 }, (_, i) => i * GRID_STEP)
  const labelEvery = data.length > 10 ? 5 : 1

  return (
    <div className="mt-6 flex gap-2">
      <div className="relative h-52 w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-52">
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className={cn('absolute inset-x-0 h-px', t === 0 ? 'bg-border' : 'bg-border/50')}
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d) => (
              <Tooltip key={d.label} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    aria-label={`${d.label}: ${d.value} claims`}
                    className="group flex h-full flex-1 items-end justify-center outline-none"
                  >
                    <span
                      className="w-full max-w-7 rounded-t-[4px] bg-chart-1 group-hover:bg-primary group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
                      style={{ height: `${(d.value / max) * 100}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {d.label} · <span className="tabular-nums">{d.value}</span> claims
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-[2px] text-xs text-muted-foreground" aria-hidden>
          {data.map((d, i) => (
            <span key={d.label} className="flex flex-1 justify-center overflow-visible whitespace-nowrap">
              {i % labelEvery === 0 ? d.label : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AnalyticsWorkspaceApp() {
  const [period, setPeriod] = useState<Period>('7d')
  const [mode, setMode] = useState<'chart' | 'table'>('chart')
  const data = analytics[period]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">Claims throughput</h3>
        <span className="text-sm text-muted-foreground">Claims Intelligence</span>
        <MockBadge label="Mock dataset" />
        <div role="group" aria-label="Period" className="ml-auto flex gap-1">
          {(['7d', '30d'] as const).map((p) => (
            <Button key={p} size="xs" variant={period === p ? 'secondary' : 'ghost'} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {p === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-6 border-b pb-6">
        <Stat label="Claims received" value={data.received.toLocaleString('en-GB')} hint={period === '7d' ? 'in 7 days' : 'in 30 days'} />
        <Stat label="Straight-through" value={`${data.straightThrough}%`} hint="settled without a handler" />
        <Stat label="Median cycle time" value={`${data.medianCycleDays} days`} hint="report to settlement" />
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <h4 className="text-sm font-medium">Claims received per day</h4>
          <div role="group" aria-label="Display" className="ml-auto flex gap-1">
            <Button size="xs" variant={mode === 'chart' ? 'secondary' : 'ghost'} aria-pressed={mode === 'chart'} onClick={() => setMode('chart')}>
              Chart
            </Button>
            <Button size="xs" variant={mode === 'table' ? 'secondary' : 'ghost'} aria-pressed={mode === 'table'} onClick={() => setMode('table')}>
              Table
            </Button>
          </div>
        </div>
        {mode === 'chart' ? (
          <DailyBars data={data.daily} />
        ) : (
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 font-medium">Day</th>
                  <th className="py-1.5 text-right font-medium">Claims received</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.label} className="border-b last:border-0">
                    <td className="py-1.5">{d.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
