import { Hexagon } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { wallpaperById } from '@/app/os/wallpapers'
import { cn } from '@/lib/utils'

/**
 * The brand wordmark of a brand wallpaper. Drawn on screen rather than baked into the image, so it
 * stays inside the lower-left safe area at any window size. Hidden where it would meet the content.
 */
export function WallpaperBrand() {
  const { wallpaper } = useOs()
  const brand = wallpaperById(wallpaper).brand
  if (!brand) return null
  const light = brand.tone === 'light'
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-[5vh] left-[3vw] z-0 hidden max-w-[56vw] items-center gap-[1.4vw] select-none md:flex [@media(max-height:700px)]:hidden">
      <span className={cn('flex size-[clamp(3rem,5vw,5.25rem)] shrink-0 items-center justify-center rounded-[28%] shadow-[0_12px_30px_-12px_oklch(0.2_0.05_250/0.6)]', light ? 'bg-white/92 text-primary' : 'bg-primary text-white')}>
        <Hexagon className="size-1/2" strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate text-[clamp(2rem,4.2vw,4.5rem)] leading-[1.05] tracking-tight', light ? 'text-white/92 [text-shadow:0_2px_24px_oklch(0.2_0.06_250/0.45)]' : 'text-primary')}>
          {brand.wordmark.split(' ').map((word, i, all) => (
            <span key={word} className={i < all.length - 1 ? 'mr-[0.25em] font-medium opacity-80' : 'font-bold'}>
              {word}
            </span>
          ))}
        </span>
        <span className={cn('mt-[0.4vw] block truncate text-[clamp(0.85rem,1.25vw,1.35rem)]', light ? 'text-white/70' : 'text-foreground/60')}>{brand.tagline}</span>
      </span>
    </div>
  )
}
