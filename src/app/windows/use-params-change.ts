import { useState } from 'react'
import type { WindowParams } from '@/app/registry/types'

/**
 * Re-targets an already-open application when it is opened again with new params
 * (deep links from widgets, notifications, the assistant). Runs `apply` during render
 * when the params object changes — React's "adjust state on prop change" pattern,
 * which avoids an extra effect pass.
 */
export function useParamsChange(params: WindowParams, apply: (params: WindowParams) => void) {
  const [seen, setSeen] = useState(params)
  if (seen !== params) {
    setSeen(params)
    apply(params)
  }
}
