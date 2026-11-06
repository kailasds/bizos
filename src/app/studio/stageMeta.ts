import { Blocks, ListChecks, Network, Puzzle, MonitorPlay, Rocket, Search, type LucideIcon } from 'lucide-react'
import type { StageId } from './types'

export const stageMeta: Record<StageId, { label: string; title: string; description: string; icon: LucideIcon }> = {
  discover: { label: 'Discover', title: 'Describe the business problem', description: 'Tell the OS what you want to achieve. It will interpret the request and check its understanding with you.', icon: Search },
  define: { label: 'Define', title: 'Requirement specification', description: 'The structured requirements every later decision is built on.', icon: ListChecks },
  architect: { label: 'Architect', title: 'Solution approach', description: 'Alternative ways to solve the problem, with their trade-offs.', icon: Network },
  compose: { label: 'Compose', title: 'Resources', description: 'Existing agents, workers, connectors and knowledge this approach needs — and anything missing.', icon: Puzzle },
  generate: { label: 'Generate', title: 'Application Blueprint', description: 'The versioned specification of the application, and a preview built from trusted components.', icon: Blocks },
  validate: { label: 'Preview', title: 'Preview', description: 'See the application as its users will. Readiness checks run automatically; only items that need your decision are shown.', icon: MonitorPlay },
  publish: { label: 'Publish', title: 'Review and publish', description: 'A final review, then the application is registered on the desktop.', icon: Rocket },
}
