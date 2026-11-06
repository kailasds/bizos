import { useMemo } from 'react'
import { Activity, Plus } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { Button } from '@/components/ui/button'
import { transactionSchemas } from '@/data/runtime.mock'
import { getRuntimeApp } from '../runtime-apps'
import { useRuntime } from '../store'
import { ExecutionDetail } from './ExecutionDetail'
import { ExecutionList } from './ExecutionList'
import { useOperationsLinks } from './links'
import { RuntimeLinksContext } from './meta'
import { TransactionForm } from './TransactionForm'

export type RuntimeView = { kind: 'new' } | { kind: 'list' } | { kind: 'execution'; id: string }

/**
 * Inside a published application: start a business transaction, watch it execute and see its
 * history. Approvals, resources and the wider picture open in the Operations workspace.
 */
export function AppRuntimePanel({ appId, view, onView }: { appId: string; view: RuntimeView; onView: (v: RuntimeView) => void }) {
  const state = useRuntime()
  const { openApp } = useOs()
  const openExecution = useMemo(() => (id: string) => onView({ kind: 'execution', id }), [onView])
  const links = useOperationsLinks({ openExecution })
  const app = getRuntimeApp(appId, state)
  if (!app) return <p className="p-4 text-sm text-muted-foreground">This application cannot run transactions.</p>
  const schema = transactionSchemas[app.domain]
  const executions = state.executions.filter((e) => e.appId === appId)

  return (
    <RuntimeLinksContext.Provider value={links}>
      <div className="@container h-full overflow-y-auto p-4 @3xl:p-6">
        {view.kind === 'new' && <TransactionForm app={app} onSubmitted={(id) => onView({ kind: 'execution', id })} />}
        {view.kind === 'list' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">Executions</h3>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => openApp('operations', { section: 'applications', app: appId })}>
                  <Activity /> Operations
                </Button>
                <Button size="sm" onClick={() => onView({ kind: 'new' })}>
                  <Plus /> {schema.action}
                </Button>
              </div>
            </div>
            <ExecutionList executions={executions} state={state} onOpen={openExecution} label={`${app.name} executions`} />
          </div>
        )}
        {view.kind === 'execution' && <ExecutionDetail key={view.id} executionId={view.id} onBack={() => onView({ kind: 'list' })} />}
      </div>
    </RuntimeLinksContext.Provider>
  )
}
