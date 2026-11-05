import type { StageId } from './types'

export const stageMeta: Record<StageId, { label: string; title: string; description: string }> = {
  discover: { label: 'Discover', title: 'Describe the business problem', description: 'Tell the OS what you want to achieve. It will interpret the request and check its understanding with you.' },
  define: { label: 'Define', title: 'Requirement specification', description: 'The structured requirements every later decision is built on.' },
  architect: { label: 'Architect', title: 'Solution approach', description: 'Alternative ways to solve the problem, with their trade-offs.' },
  compose: { label: 'Compose', title: 'Resources', description: 'Existing agents, workers, connectors and knowledge this approach needs — and anything missing.' },
  generate: { label: 'Generate', title: 'Application Blueprint', description: 'The versioned specification of the application, and a preview built from trusted components.' },
  validate: { label: 'Validate', title: 'Validation', description: 'Checks that must pass before the application can be published.' },
  publish: { label: 'Publish', title: 'Review and publish', description: 'A final review, then the application is registered on the desktop.' },
}
