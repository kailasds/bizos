import { useCallback, useSyncExternalStore } from 'react'
import type { SampleRecord } from '@/app/blueprint/types'

/**
 * Records created or decided inside published (generated) applications. MOCK data,
 * persisted locally per application so simulated approvals survive a reload.
 */

const KEY = 'enterprise-ai-os:app-records:v1'

function load(): Record<string, SampleRecord[]> {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, SampleRecord[]>) : {}
  } catch {
    return {}
  }
}

let data: Record<string, SampleRecord[]> = typeof window === 'undefined' ? {} : load()
const listeners = new Set<() => void>()

export function getAppRecords(appId: string): SampleRecord[] | undefined {
  return data[appId]
}

export function setAppRecords(appId: string, records: SampleRecord[]) {
  data = { ...data, [appId]: records }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable: records stay for this session.
  }
  listeners.forEach((l) => l())
}

export function subscribeAppRecords(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => data

/** Every application's records; re-renders when any change. */
export function useAllAppRecords() {
  return useSyncExternalStore(subscribeAppRecords, snapshot, snapshot)
}

/** Persisted records for one application, seeded from mock sample data. */
export function useAppRecords(appId: string, seed: SampleRecord[]) {
  const all = useAllAppRecords()
  const records = all[appId] ?? seed
  const update = useCallback(
    (fn: (list: SampleRecord[]) => SampleRecord[]) => setAppRecords(appId, fn(getAppRecords(appId) ?? seed)),
    [appId, seed],
  )
  return [records, update] as const
}
