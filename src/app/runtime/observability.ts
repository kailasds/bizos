/**
 * Derived operational views. Every number is a count of runtime records — nothing is
 * generated independently, and there are no rates, percentages or time savings.
 */

import { getResource } from '@/app/services/mock/resource-discovery-service'
import { availabilityLabel } from '@/data/resources.mock'
import { isTerminal } from './engine'
import { listRuntimeApps } from './runtime-apps'
import type { Execution, ExecutionStep, RuntimeApp, RuntimeState } from './types'

export interface ResourceActivity {
  id: string
  name: string
  kind: string
  owner: string
  version: string
  availability: string
  available: boolean
  appIds: string[]
  invocations: { execution: Execution; step: ExecutionStep }[]
  errors: { execution: Execution; step: ExecutionStep }[]
  running: number
  lastAt?: string
}

/** Resources referenced by runnable applications, with their runtime invocations. */
export function resourceActivity(state: RuntimeState, apps: RuntimeApp[] = listRuntimeApps(state)): ResourceActivity[] {
  const map = new Map<string, ResourceActivity>()
  for (const app of apps) {
    for (const ref of Object.values(app.blueprint.resources).flat()) {
      const catalogue = getResource(ref.id)
      const entry =
        map.get(ref.id) ??
        ({
          id: ref.id,
          name: ref.name,
          kind: ref.kind,
          owner: ref.owner,
          version: ref.version,
          availability: catalogue ? availabilityLabel[catalogue.availability] : ref.origin === 'created' ? 'Available (composed, simulated)' : 'Available',
          available: catalogue ? catalogue.availability === 'available' : true,
          appIds: [],
          invocations: [],
          errors: [],
          running: 0,
        } satisfies ResourceActivity)
      if (!entry.appIds.includes(app.appId)) entry.appIds.push(app.appId)
      map.set(ref.id, entry)
    }
  }
  for (const execution of state.executions) {
    for (const step of execution.steps) {
      const entry = step.resource && map.get(step.resource.id)
      if (!entry || step.status === 'waiting' || step.status === 'skipped') continue
      entry.invocations.push({ execution, step })
      if (step.status === 'failed') entry.errors.push({ execution, step })
      if (step.status === 'running') entry.running += 1
      const at = step.endedAt ?? step.startedAt
      if (at && (!entry.lastAt || at > entry.lastAt)) entry.lastAt = at
    }
  }
  return [...map.values()].sort((a, b) => b.invocations.length - a.invocations.length || a.name.localeCompare(b.name))
}

export interface AppSummary {
  total: number
  completed: number
  inProgress: number
  waiting: number
  failed: number
  cancelled: number
  humanDecisions: number
  outcomes: { label: string; count: number }[]
}

export function appSummary(state: RuntimeState, appId?: string): AppSummary {
  const execs = state.executions.filter((e) => !appId || e.appId === appId)
  const outcomes = new Map<string, number>()
  for (const o of state.outcomes.filter((o) => !appId || o.appId === appId)) outcomes.set(o.label, (outcomes.get(o.label) ?? 0) + 1)
  return {
    total: execs.length,
    completed: execs.filter((e) => e.status === 'completed').length,
    inProgress: execs.filter((e) => !isTerminal(e.status) && e.status !== 'waiting-approval').length,
    waiting: execs.filter((e) => e.status === 'waiting-approval').length,
    failed: execs.filter((e) => e.status === 'failed').length,
    cancelled: execs.filter((e) => e.status === 'cancelled').length,
    humanDecisions: state.approvals.filter((a) => (!appId || a.appId === appId) && (a.status === 'approved' || a.status === 'rejected')).length,
    outcomes: [...outcomes.entries()].map(([label, count]) => ({ label, count })),
  }
}
