/** Home-screen wallpapers. Each id maps to a `[data-wallpaper]` block in index.css. */
export type WallpaperId = 'horizon' | 'brand-blue' | 'brand-night' | 'brand-light'

export interface Wallpaper {
  id: WallpaperId
  name: string
  thumb: string
  /** The wordmark drawn over the artwork, kept in a safe area of the screen. */
  brand?: { wordmark: string; tagline: string; tone: 'light' | 'dark' }
}

export const wallpapers: Wallpaper[] = [
  { id: 'brand-blue', name: 'Signature', thumb: '/wallpapers/brand-blue-thumb.webp', brand: { wordmark: 'TCS BiOS', tagline: 'Describe a business problem. Get a working application.', tone: 'light' } },
  { id: 'brand-night', name: 'Midnight', thumb: '/wallpapers/brand-night-thumb.webp', brand: { wordmark: 'TCS BiOS', tagline: 'The business operating system', tone: 'light' } },
  { id: 'brand-light', name: 'Daylight', thumb: '/wallpapers/brand-light-thumb.webp', brand: { wordmark: 'TCS BiOS', tagline: 'Business operating system', tone: 'dark' } },
  { id: 'horizon', name: 'Horizon (classic)', thumb: '/wallpapers/horizon-thumb.webp' },
]

export const isWallpaperId = (v: unknown): v is WallpaperId => wallpapers.some((w) => w.id === v)
export const wallpaperById = (id: WallpaperId) => wallpapers.find((w) => w.id === id)!
