/** Mock reporting dataset for Analytics Workspace. Fabricated figures. */

export type Period = '7d' | '30d'

export interface DailyCount {
  label: string
  value: number
}

export interface AnalyticsSnapshot {
  received: number
  straightThrough: number // percent
  medianCycleDays: number
  daily: DailyCount[]
}

const week = [44, 19, 14, 52, 47, 41, 38]
const weekLabels = ['Fri 30', 'Sat 31', 'Sun 1', 'Mon 2', 'Tue 3', 'Wed 4', 'Thu 5']

const dayLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

const month = [45, 39, 42, 17, 12, 51, 48, 46, 43, 40, 16, 13, 55, 50, 47, 42, 44, 18, 11, 49, 45, 41, 40, ...week]

export const analytics: Record<Period, AnalyticsSnapshot> = {
  '7d': {
    received: week.reduce((a, b) => a + b, 0),
    straightThrough: 34,
    medianCycleDays: 3.2,
    daily: week.map((value, i) => ({ label: weekLabels[i], value })),
  },
  '30d': {
    received: month.reduce((a, b) => a + b, 0),
    straightThrough: 31,
    medianCycleDays: 3.6,
    daily: month.map((value, i) => ({ label: dayLabel.format(new Date(2026, 9, 7 + i)), value })),
  },
}
