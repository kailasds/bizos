import { lazy, type ComponentType } from 'react'
import type { AppId, AppProps, BuiltinAppId } from './types'

/**
 * Maps each built-in application to the UI it renders inside a window.
 * Applications load on first open, so the shell does not ship every app up front.
 */
const builtinComponents: Record<BuiltinAppId, ComponentType<AppProps>> = {
  'application-studio': lazy(() =>
    import('@/app/studio/ApplicationStudioApp').then((m) => ({ default: m.ApplicationStudioApp })),
  ),
  'claims-intelligence': lazy(() =>
    import('@/app/applications/claims-intelligence/ClaimsIntelligenceApp').then((m) => ({ default: m.ClaimsIntelligenceApp })),
  ),
  'document-ai': lazy(() => import('@/app/applications/document-ai/DocumentAiApp').then((m) => ({ default: m.DocumentAiApp }))),
  'workflow-studio': lazy(() =>
    import('@/app/applications/workflow-studio/WorkflowStudioApp').then((m) => ({ default: m.WorkflowStudioApp })),
  ),
  'analytics-workspace': lazy(() =>
    import('@/app/applications/analytics-workspace/AnalyticsWorkspaceApp').then((m) => ({ default: m.AnalyticsWorkspaceApp })),
  ),
  'system-explorer': lazy(() =>
    import('@/app/applications/system-explorer/SystemExplorerApp').then((m) => ({ default: m.SystemExplorerApp })),
  ),
  settings: lazy(() => import('@/app/applications/settings/SettingsApp').then((m) => ({ default: m.SettingsApp }))),
  'folder-browser': lazy(() =>
    import('@/app/applications/folder-browser/FolderBrowserApp').then((m) => ({ default: m.FolderBrowserApp })),
  ),
}

/** Every generated application renders through the same blueprint-driven host. */
const GeneratedAppHost = lazy(() =>
  import('@/app/experience/GeneratedAppHost').then((m) => ({ default: m.GeneratedAppHost })),
)

export function resolveAppComponent(appId: AppId): ComponentType<AppProps> {
  return appId.startsWith('app-') ? GeneratedAppHost : builtinComponents[appId as BuiltinAppId]
}
