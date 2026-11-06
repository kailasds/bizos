import { useMemo } from 'react'
import { useOs } from '@/app/os/use-os'
import type { RuntimeLinks } from './meta'

/** Links that open the Operations workspace — the default outside Operations itself. */
export function useOperationsLinks(overrides: Partial<RuntimeLinks> = {}): RuntimeLinks {
  const { openApp } = useOs()
  const { openExecution, openApproval, openApplication, openResource } = overrides
  return useMemo(
    () => ({
      openExecution: openExecution ?? ((id) => openApp('operations', { section: 'executions', execution: id })),
      openApproval: openApproval ?? ((id) => openApp('operations', { section: 'approvals', approval: id })),
      openApplication: openApplication ?? ((appId) => openApp('operations', { section: 'applications', app: appId })),
      openResource: openResource ?? ((id) => openApp('operations', { section: 'resources', resource: id })),
    }),
    [openApp, openExecution, openApproval, openApplication, openResource],
  )
}
