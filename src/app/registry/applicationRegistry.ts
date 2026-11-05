import {
  ChartColumn,
  Compass,
  Folder,
  ScanText,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import type { AppDefinition, AppId, DomainId, FolderDefinition } from './types'

/**
 * Centralised application registry (mock-backed in Phase 1).
 * Metadata only — the component for each app lives in `applicationComponents.tsx`
 * so the shell can depend on metadata without importing every application.
 */
export const applications: AppDefinition[] = [
  {
    id: 'claims-intelligence',
    name: 'Claims Intelligence',
    description: 'Triage, assess and approve insurance claims with AI-assisted review.',
    kind: 'application',
    icon: ShieldCheck,
    tint: 'blue',
    domains: ['insurance'],
    version: '0.4.0',
    lifecycle: 'published',
    owner: 'Claims Operations',
    desktopShortcut: true,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 1120, height: 700 },
    minSize: { width: 640, height: 420 },
  },
  {
    id: 'document-ai',
    name: 'Document AI',
    description: 'Classify incoming documents and review extracted fields before they enter a workflow.',
    kind: 'application',
    icon: ScanText,
    tint: 'teal',
    domains: ['insurance', 'healthcare', 'banking'],
    version: '0.3.1',
    lifecycle: 'published',
    owner: 'Shared Services',
    desktopShortcut: true,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 1080, height: 680 },
    minSize: { width: 640, height: 420 },
  },
  {
    id: 'workflow-studio',
    name: 'Workflow Studio',
    description: 'Browse the workflow definitions that applications run on.',
    kind: 'application',
    icon: Workflow,
    tint: 'amber',
    domains: [],
    version: '0.1.0',
    lifecycle: 'preview',
    owner: 'Platform Team',
    desktopShortcut: true,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 920, height: 600 },
    minSize: { width: 560, height: 380 },
  },
  {
    id: 'analytics-workspace',
    name: 'Analytics Workspace',
    description: 'Throughput and outcome reporting for published applications.',
    kind: 'application',
    icon: ChartColumn,
    tint: 'coral',
    domains: ['insurance', 'banking'],
    version: '0.1.0',
    lifecycle: 'preview',
    owner: 'Business Insights',
    desktopShortcut: true,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 940, height: 620 },
    minSize: { width: 560, height: 380 },
  },
  {
    id: 'system-explorer',
    name: 'System Explorer',
    description: 'Inspect the applications, resources and activity this OS contains.',
    kind: 'system',
    icon: Compass,
    tint: 'graphite',
    domains: [],
    version: '0.1.0',
    lifecycle: 'system',
    owner: 'Enterprise AI OS',
    desktopShortcut: true,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 1000, height: 640 },
    minSize: { width: 600, height: 400 },
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Desktop, widget and notification preferences.',
    kind: 'system',
    icon: Settings,
    tint: 'graphite',
    domains: [],
    version: '0.1.0',
    lifecycle: 'system',
    owner: 'Enterprise AI OS',
    desktopShortcut: false,
    pinned: false,
    inLauncher: true,
    defaultSize: { width: 760, height: 540 },
    minSize: { width: 480, height: 360 },
  },
  {
    id: 'folder-browser',
    name: 'Folders',
    description: 'Browse applications by domain.',
    kind: 'system',
    icon: Folder,
    tint: 'graphite',
    domains: [],
    version: '0.1.0',
    lifecycle: 'system',
    owner: 'Enterprise AI OS',
    desktopShortcut: false,
    pinned: false,
    inLauncher: false,
    defaultSize: { width: 820, height: 520 },
    minSize: { width: 480, height: 340 },
  },
]

export const folders: FolderDefinition[] = [
  { id: 'insurance', name: 'Insurance', description: 'Claims, policy and underwriting applications.' },
  { id: 'healthcare', name: 'Healthcare', description: 'Patient, provider and payer applications.' },
  { id: 'banking', name: 'Banking', description: 'Lending, onboarding and risk applications.' },
]

const byId = new Map(applications.map((app) => [app.id, app]))

export function getApp(id: AppId): AppDefinition {
  const app = byId.get(id)
  if (!app) throw new Error(`Unknown application: ${id}`)
  return app
}

export function isAppId(value: string): value is AppId {
  return byId.has(value as AppId)
}

export function getFolder(id: string): FolderDefinition | undefined {
  return folders.find((folder) => folder.id === id)
}

export function appsInFolder(id: DomainId): AppDefinition[] {
  return applications.filter((app) => app.domains.includes(id))
}

export const businessApps = applications.filter((app) => app.kind === 'application')
export const pinnedApps = applications.filter((app) => app.pinned)
export const desktopShortcuts = applications.filter((app) => app.desktopShortcut)
export const launcherApps = applications.filter((app) => app.inLauncher)
