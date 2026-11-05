import { useSyncExternalStore } from 'react'
import { listApps, subscribeRegistry } from './applicationRegistry'

/** Every registered application; re-renders when an application is published. */
export function useApplications() {
  return useSyncExternalStore(subscribeRegistry, listApps, listApps)
}
