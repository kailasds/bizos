/** Every key the prototype writes to local storage starts with this prefix. */
export const STORAGE_PREFIX = 'enterprise-ai-os:'

/** Removes all locally stored prototype data (drafts, published apps, decisions, preferences) and reloads. */
export function resetDemoData() {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).filter(
      (k): k is string => Boolean(k?.startsWith(STORAGE_PREFIX)),
    )
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Storage unavailable: nothing was persisted, a reload is enough.
  }
  window.location.reload()
}
