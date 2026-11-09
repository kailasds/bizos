/** Home-screen wallpapers. Each id maps to a `[data-wallpaper]` block in index.css. */
export type WallpaperId = 'horizon' | 'dawn' | 'aurora' | 'brand'

export const wallpapers: { id: WallpaperId; name: string; thumb: string }[] = [
  { id: 'horizon', name: 'Horizon', thumb: '/wallpapers/horizon-thumb.webp' },
  { id: 'dawn', name: 'Dawn', thumb: '/wallpapers/dawn-thumb.webp' },
  { id: 'aurora', name: 'Aurora', thumb: '/wallpapers/aurora-thumb.webp' },
  { id: 'brand', name: 'Enterprise AI OS', thumb: '/wallpapers/brand-thumb.webp' },
]

export const isWallpaperId = (v: unknown): v is WallpaperId => wallpapers.some((w) => w.id === v)
