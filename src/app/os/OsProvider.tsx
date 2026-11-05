import { useCallback, useMemo, useReducer, useState, type ReactNode } from 'react'
import { getApp } from '@/app/registry/applicationRegistry'
import type { AppId, Size, WindowParams } from '@/app/registry/types'
import {
  initialWindowState,
  topWindowId,
  windowReducer,
  type Bounds,
} from '@/app/windows/windowReducer'
import { initialNotifications, type OsNotification } from '@/data/notifications.mock'
import { OsContext, type OsContextValue, type WidgetId, type WidgetPreferences } from './os-context'

const PREFS_KEY = 'enterprise-ai-os:widgets:v1'

const defaultWidgetPreferences: WidgetPreferences = {
  'platform-health': true,
  'pending-approvals': true,
  'active-applications': true,
  'active-executions': true,
  'worker-activity': true,
  'recent-activity': true,
}

function loadPreferences(): WidgetPreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultWidgetPreferences
    return { ...defaultWidgetPreferences, ...(JSON.parse(raw) as Partial<WidgetPreferences>) }
  } catch {
    return defaultWidgetPreferences
  }
}

function savePreferences(prefs: WidgetPreferences) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable (private mode, blocked) — preferences stay in memory.
  }
}

export function OsProvider({ children }: { children: ReactNode }) {
  const [windowState, dispatch] = useReducer(windowReducer, initialWindowState)
  const [desktopArea, setDesktopAreaState] = useState<Size>({ width: 1200, height: 760 })
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<OsNotification[]>(initialNotifications)
  const [widgetPreferences, setWidgetPreferences] = useState<WidgetPreferences>(loadPreferences)

  const { windows } = windowState
  const focusedId = topWindowId(windows)

  const setDesktopArea = useCallback((size: Size) => {
    setDesktopAreaState((prev) =>
      prev.width === size.width && prev.height === size.height ? prev : size,
    )
  }, [])

  const openApp = useCallback(
    (appId: AppId, params?: WindowParams) => {
      dispatch({ type: 'open', appId, params, area: desktopArea, size: getApp(appId).defaultSize })
    },
    [desktopArea],
  )

  const activateFromDock = useCallback(
    (appId: AppId) => {
      const existing = windows.find((w) => w.appId === appId)
      if (!existing) return openApp(appId)
      if (existing.status === 'minimized') return dispatch({ type: 'restore', id: existing.id })
      if (existing.id === focusedId) return dispatch({ type: 'minimize', id: existing.id })
      dispatch({ type: 'focus', id: existing.id })
    },
    [windows, focusedId, openApp],
  )

  const focusWindow = useCallback((id: string) => dispatch({ type: 'focus', id }), [])
  const closeWindow = useCallback((id: string) => dispatch({ type: 'close', id }), [])
  const minimizeWindow = useCallback((id: string) => dispatch({ type: 'minimize', id }), [])
  const toggleMaximize = useCallback((id: string) => dispatch({ type: 'toggleMaximize', id }), [])
  const setWindowBounds = useCallback(
    (id: string, bounds: Bounds) => dispatch({ type: 'setBounds', id, bounds }),
    [],
  )
  const closeAllWindows = useCallback(() => dispatch({ type: 'closeAll' }), [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
  }, [])
  const dismissNotification = useCallback((id: string) => {
    setNotifications((list) => list.filter((n) => n.id !== id))
  }, [])
  const clearNotifications = useCallback(() => setNotifications([]), [])

  const setWidgetVisible = useCallback((id: WidgetId, visible: boolean) => {
    setWidgetPreferences((prev) => {
      const next = { ...prev, [id]: visible }
      savePreferences(next)
      return next
    })
  }, [])

  const resetPreferences = useCallback(() => {
    savePreferences(defaultWidgetPreferences)
    setWidgetPreferences(defaultWidgetPreferences)
  }, [])

  const value = useMemo<OsContextValue>(
    () => ({
      windows,
      focusedId,
      desktopArea,
      setDesktopArea,
      openApp,
      activateFromDock,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      setWindowBounds,
      closeAllWindows,
      launcherOpen,
      setLauncherOpen,
      assistantOpen,
      setAssistantOpen,
      notificationsOpen,
      setNotificationsOpen,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
      widgetPreferences,
      setWidgetVisible,
      resetPreferences,
    }),
    [
      windows,
      focusedId,
      desktopArea,
      setDesktopArea,
      openApp,
      activateFromDock,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      setWindowBounds,
      closeAllWindows,
      launcherOpen,
      assistantOpen,
      notificationsOpen,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
      widgetPreferences,
      setWidgetVisible,
      resetPreferences,
    ],
  )

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>
}
