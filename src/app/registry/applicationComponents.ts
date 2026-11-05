import { lazy, type ComponentType } from 'react'
import type { AppId, AppProps } from './types'

/**
 * Maps each registered application to the UI it renders inside a window.
 * Applications load on first open, so the shell does not ship every app up front.
 */
export const applicationComponents: Record<AppId, ComponentType<AppProps>> = {
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
