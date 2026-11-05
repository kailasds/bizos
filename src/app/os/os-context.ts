import { createContext } from 'react'
import type { AppId, Size, WindowParams } from '@/app/registry/types'
import type { Bounds, WindowState } from '@/app/windows/windowReducer'
import type { OsNotification } from '@/data/notifications.mock'

export type WidgetId =
  | 'platform-health'
  | 'pending-approvals'
  | 'active-applications'
  | 'active-executions'
  | 'worker-activity'
  | 'recent-activity'

export type WidgetPreferences = Record<WidgetId, boolean>

export interface OsContextValue {
  // Windows
  windows: WindowState[]
  focusedId: string | null
  desktopArea: Size
  setDesktopArea: (size: Size) => void
  openApp: (appId: AppId, params?: WindowParams) => void
  /** Dock behaviour: open, focus, restore, or minimize when already focused. */
  activateFromDock: (appId: AppId) => void
  focusWindow: (id: string) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  toggleMaximize: (id: string) => void
  setWindowBounds: (id: string, bounds: Bounds) => void
  closeAllWindows: () => void

  // System surfaces
  launcherOpen: boolean
  setLauncherOpen: (open: boolean) => void
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  notificationsOpen: boolean
  setNotificationsOpen: (open: boolean) => void

  // Notifications
  notifications: OsNotification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  dismissNotification: (id: string) => void
  clearNotifications: () => void

  // Preferences
  widgetPreferences: WidgetPreferences
  setWidgetVisible: (id: WidgetId, visible: boolean) => void
  resetPreferences: () => void
}

export const OsContext = createContext<OsContextValue | null>(null)
