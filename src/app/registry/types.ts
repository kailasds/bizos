import type { LucideIcon } from 'lucide-react'

/** Built-in application identity. Never use display names as identity. */
export type BuiltinAppId =
  | 'application-studio'
  | 'claims-intelligence'
  | 'document-ai'
  | 'workflow-studio'
  | 'analytics-workspace'
  | 'system-explorer'
  | 'operations'
  | 'learning'
  | 'settings'
  | 'folder-browser'

/** Applications published from Application Studio. Stable from first generation. */
export type GeneratedAppId = `app-${string}`

export type AppId = BuiltinAppId | GeneratedAppId

export type DomainId = 'insurance' | 'healthcare' | 'banking'

/** Identity colour for an app icon. Maps to a `--tint-*` token. */
export type AppTint = 'blue' | 'teal' | 'amber' | 'coral' | 'graphite'

/** `application` = a business application; `system` = an OS workspace. */
export type AppKind = 'application' | 'system'

/** Lifecycle status of a registered application (mock in Phase 1). */
export type AppLifecycle = 'published' | 'preview' | 'system'

export type WindowParams = Record<string, string>

export interface Size {
  width: number
  height: number
}

export interface AppDefinition {
  id: AppId
  name: string
  description: string
  /** A few words for compact surfaces (desktop cards). */
  tagline?: string
  kind: AppKind
  icon: LucideIcon
  tint: AppTint
  domains: DomainId[]
  version: string
  lifecycle: AppLifecycle
  owner: string
  /** Shown as a standalone shortcut on the desktop canvas. */
  desktopShortcut: boolean
  /** Pinned to the dock. */
  pinned: boolean
  /** Listed in the application launcher. */
  inLauncher: boolean
  defaultSize: Size
  minSize: Size
  /** Open as a full workspace (maximized) the first time. */
  startMaximized?: boolean
  /** Present for applications published from Application Studio. */
  generated?: { projectId: string; publishedAt: string }
}

export interface FolderDefinition {
  id: DomainId
  name: string
  description: string
}

/** Props every hosted application receives from the window manager. */
export interface AppProps {
  windowId: string
  params: WindowParams
}
