/**
 * MOCK learning views over runtime records. Groups signals into themes and states plainly
 * whether something is a single observation or a recurring pattern. The OS observes outcomes
 * and proposes application changes; worker learning stays with the AI Workers Platform.
 */

import type { ImprovementProposal, LearningSignal, RuntimeState, SignalType } from '@/app/runtime/types'

export interface Theme {
  key: string
  appId: string
  nodeId: string
  stepName: string
  type: SignalType
  signals: LearningSignal[]
  proposal?: ImprovementProposal
  latest: string
}

export function themesOf(state: RuntimeState): Theme[] {
  const map = new Map<string, Theme>()
  for (const s of state.signals) {
    const t = map.get(s.themeKey) ?? { key: s.themeKey, appId: s.appId, nodeId: s.nodeId, stepName: s.stepName, type: s.type, signals: [], latest: s.at }
    t.signals.push(s)
    if (s.at > t.latest) t.latest = s.at
    map.set(s.themeKey, t)
  }
  for (const t of map.values()) t.proposal = state.proposals.find((p) => p.signalIds.some((id) => t.signals.some((s) => s.id === id)))
  return [...map.values()].sort((a, b) => b.latest.localeCompare(a.latest))
}

/** Never call one example a pattern. */
export const patternLabel = (n: number) => (n === 1 ? 'Single observation — not a pattern yet' : `Recurring: ${n} observations`)

export const whyItMatters: Record<SignalType, string> = {
  'failed-execution': 'Failed executions stop transactions before a business outcome is reached and need someone to step in.',
  'repeated-exception': 'Repeated exceptions suggest the workflow does not handle a common case.',
  'human-correction': 'Human corrections show where automated output needed fixing.',
  'approval-rejected': 'Rejected approvals can mean cases reach reviewers without the information or routing they need.',
  'missing-information': 'Missing information leads to manual lookups, requests sent back and longer handling.',
  'resource-unavailable': 'When a required resource is unavailable, transactions cannot complete.',
  bottleneck: 'Bottlenecks delay outcomes for every transaction behind them.',
  'outcome-feedback': 'Feedback on outcomes shows whether decisions met expectations.',
}
