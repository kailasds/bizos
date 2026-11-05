import type { LucideIcon } from 'lucide-react'

/** Stable application identity. Never use display names as identity. */
export type AppId =
  | 'claims-intelligence'
  | 'document-ai'
  | 'workflow-studio'
  | 'analytics-workspace'
  | 'system-explorer'
  | 'settings'
  | 'folder-browser'

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
