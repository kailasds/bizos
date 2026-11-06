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
import { OsContext, type OsContextValue, type RecentApp, type WidgetId, type WidgetPreferences } from './os-context'

const PREFS_KEY = 'enterprise-ai-os:widgets:v1'
const RECENTS_KEY = 'enterprise-ai-os:recent-apps:v1'

function loadRecents(): RecentApp[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    return raw ? (JSON.parse(raw) as RecentApp[]) : []
  } catch {
    return []
  }
}

const defaultWidgetPreferences: WidgetPreferences = {
  'platform-health': true,
  'pending-approvals': true,
  'active-executions': false,
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
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<OsNotification[]>(initialNotifications)
  const [recentApps, setRecentApps] = useState<RecentApp[]>(loadRecents)
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
      const app = getApp(appId)
      dispatch({ type: 'open', appId, params, area: desktopArea, size: app.defaultSize, maximized: app.startMaximized })
      if (appId !== 'folder-browser') {
        setRecentApps((list) => {
          const next = [{ appId, openedAt: new Date().toISOString() }, ...list.filter((r) => r.appId !== appId)].slice(0, 8)
          try {
            window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
          } catch {
            // Storage unavailable — recents last for this session.
          }
          return next
        })
      }
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
  const showDesktop = useCallback(() => {
    for (const w of windows) if (w.status !== 'minimized') dispatch({ type: 'minimize', id: w.id })
  }, [windows])

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
  const pushNotification = useCallback((notification: Omit<OsNotification, 'id' | 'read'>) => {
    setNotifications((list) => [{ ...notification, id: `N-${Date.now()}`, read: false }, ...list])
  }, [])

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
      showDesktop,
      recentApps,
      launcherOpen,
      setLauncherOpen,
      notificationsOpen,
      setNotificationsOpen,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
      pushNotification,
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
      showDesktop,
      recentApps,
      launcherOpen,
      notificationsOpen,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
      pushNotification,
      widgetPreferences,
      setWidgetVisible,
      resetPreferences,
    ],
  )

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>
}
