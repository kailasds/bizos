import { Bot, Settings2, User, type LucideIcon } from 'lucide-react'
import type { StepActor } from '@/app/blueprint/types'

export const actorMeta: Record<StepActor, { label: string; icon: LucideIcon; tile: string; ring: string; lane: string }> = {
  human: { label: 'People', icon: User, tile: 'bg-actor-person-soft text-[oklch(0.5_0.12_60)]', ring: 'border-actor-person/60', lane: 'bg-actor-person-soft/50' },
  automated: { label: 'AI and automation', icon: Bot, tile: 'bg-actor-ai-soft text-actor-ai', ring: 'border-actor-ai/40', lane: 'bg-actor-ai-soft/50' },
  system: { label: 'Rules and systems', icon: Settings2, tile: 'bg-actor-system-soft text-actor-system', ring: 'border-actor-system/40', lane: 'bg-actor-system-soft/50' },
}
