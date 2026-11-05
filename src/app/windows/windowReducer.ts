import type { AppId, Size, WindowParams } from '@/app/registry/types'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export type WindowStatus = 'normal' | 'maximized' | 'minimized'

export interface WindowState {
  /** Window identity. Applications are single-instance, so this equals the app id. */
  id: string
  appId: AppId
  params: WindowParams
  bounds: Bounds
  status: WindowStatus
  /** Status to return to when restored from minimized. */
  restoreStatus: Exclude<WindowStatus, 'minimized'>
  z: number
}

export interface WindowManagerState {
  /** In open order — the dock lists running windows in this order. */
  windows: WindowState[]
  nextZ: number
}

export type WindowAction =
  | { type: 'open'; appId: AppId; params?: WindowParams; area: Size; size: Size; maximized?: boolean }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'toggleMaximize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'setBounds'; id: string; bounds: Bounds }
  | { type: 'closeAll' }

export const initialWindowState: WindowManagerState = { windows: [], nextZ: 1 }

const EDGE = 12
const CASCADE_STEP = 28

export function topWindowId(windows: WindowState[]): string | null {
  let top: WindowState | null = null
  for (const w of windows) {
    if (w.status === 'minimized') continue
    if (!top || w.z > top.z) top = w
  }
  return top?.id ?? null
}

function initialBounds(state: WindowManagerState, area: Size, size: Size): Bounds {
  const width = Math.max(320, Math.min(size.width, area.width - EDGE * 2))
  const height = Math.max(240, Math.min(size.height, area.height - EDGE * 2))
  const step = (state.windows.length % 6) * CASCADE_STEP
  const x = Math.round((area.width - width) / 2) - CASCADE_STEP * 2 + step
  const y = EDGE + step
  return clampBounds({ x, y, width, height }, area)
}

/** Keep a window reachable inside the desktop area. */
export function clampBounds(bounds: Bounds, area: Size): Bounds {
  if (area.width <= 0 || area.height <= 0) return bounds
  const width = Math.min(bounds.width, area.width)
  const height = Math.min(bounds.height, area.height)
  const x = Math.min(Math.max(bounds.x, 0), Math.max(0, area.width - width))
  const y = Math.min(Math.max(bounds.y, 0), Math.max(0, area.height - height))
  return { x, y, width, height }
}

function update(
  state: WindowManagerState,
  id: string,
  fn: (w: WindowState, z: number) => WindowState,
  bumpZ = true,
): WindowManagerState {
  const target = state.windows.find((w) => w.id === id)
  if (!target) return state
  const z = bumpZ ? state.nextZ : target.z
  return {
    windows: state.windows.map((w) => (w.id === id ? fn(w, z) : w)),
    nextZ: bumpZ ? state.nextZ + 1 : state.nextZ,
  }
}

export function windowReducer(state: WindowManagerState, action: WindowAction): WindowManagerState {
  switch (action.type) {
    case 'open': {
      const existing = state.windows.find((w) => w.appId === action.appId)
      if (existing) {
        return update(state, existing.id, (w, z) => ({
          ...w,
          params: action.params ?? w.params,
          status: w.status === 'minimized' ? w.restoreStatus : w.status,
          z,
        }))
      }
      const window: WindowState = {
        id: action.appId,
        appId: action.appId,
        params: action.params ?? {},
        bounds: initialBounds(state, action.area, action.size),
        status: action.maximized ? 'maximized' : 'normal',
        restoreStatus: action.maximized ? 'maximized' : 'normal',
        z: state.nextZ,
      }
      return { windows: [...state.windows, window], nextZ: state.nextZ + 1 }
    }
    case 'close':
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) }
    case 'focus': {
      if (topWindowId(state.windows) === action.id) return state
      return update(state, action.id, (w, z) => ({
        ...w,
        status: w.status === 'minimized' ? w.restoreStatus : w.status,
        z,
      }))
    }
    case 'minimize':
      return update(
        state,
        action.id,
        (w) =>
          w.status === 'minimized' ? w : { ...w, status: 'minimized', restoreStatus: w.status },
        false,
      )
    case 'restore':
      return update(state, action.id, (w, z) => ({
        ...w,
        status: w.status === 'minimized' ? w.restoreStatus : w.status,
        z,
      }))
    case 'toggleMaximize':
      return update(state, action.id, (w, z) => {
        const next = w.status === 'maximized' ? 'normal' : 'maximized'
        return { ...w, status: next, restoreStatus: next, z }
      })
    case 'setBounds':
      return update(state, action.id, (w) => ({ ...w, bounds: action.bounds }), false)
    case 'closeAll':
      return initialWindowState
  }
}
