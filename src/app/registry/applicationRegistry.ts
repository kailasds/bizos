import {
  AppWindow,
  Blocks,
  ChartColumn,
  ClipboardList,
  Compass,
  Folder,
  HeartPulse,
  Landmark,
  ScanText,
  Settings,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { ApplicationBlueprint } from '@/app/blueprint/types'
import type { AppDefinition, AppId, AppTint, DomainId, FolderDefinition, GeneratedAppId } from './types'

/**
 * Centralised application registry (mock-backed).
 * Built-in applications are static metadata. Applications published from
 * Application Studio are added at runtime through `registerGeneratedApp` and
 * persisted locally. Components live in `applicationComponents.ts` so the shell
 * can depend on metadata without importing every application.
 */
const builtinApplications: AppDefinition[] = [
  {
    id: 'application-studio',
    name: 'Application Studio',
    description: 'Describe a business problem and design, generate and publish an application for it.',
    kind: 'system',
    icon: Blocks,
    tint: 'graphite',
    domains: [],
    version: '0.2.0',
    lifecycle: 'system',
    owner: 'Enterprise AI OS',
    desktopShortcut: false,
    pinned: true,
    inLauncher: true,
    defaultSize: { width: 1280, height: 780 },
    minSize: { width: 720, height: 480 },
    startMaximized: true,
  },
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

// ── Generated applications ────────────────────────────────────────────────

/** Serializable registry entry for an application published from Application Studio. */
export interface GeneratedAppRecord {
  id: GeneratedAppId
  name: string
  description: string
  domain: DomainId
  iconKey: GeneratedIconKey
  tint: AppTint
  version: string
  owner: string
  projectId: string
  publishedAt: string
  /** The published blueprint, pinned at this version. */
  blueprint: ApplicationBlueprint
}

export type GeneratedIconKey = 'claims' | 'health' | 'lending' | 'app'

const generatedIcons: Record<GeneratedIconKey, LucideIcon> = {
  claims: ClipboardList,
  health: HeartPulse,
  lending: Landmark,
  app: AppWindow,
}

const STORAGE_KEY = 'enterprise-ai-os:generated-apps:v1'

function loadRecords(): GeneratedAppRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GeneratedAppRecord[]) : []
  } catch {
    return []
  }
}

function saveRecords(list: GeneratedAppRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage unavailable — the published app stays registered for this session only.
  }
}

function toDefinition(record: GeneratedAppRecord): AppDefinition {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    kind: 'application',
    icon: generatedIcons[record.iconKey] ?? AppWindow,
    tint: record.tint,
    domains: [record.domain],
    version: record.version,
    lifecycle: 'published',
    owner: record.owner,
    desktopShortcut: true,
    pinned: false,
    inLauncher: true,
    defaultSize: { width: 1120, height: 700 },
    minSize: { width: 640, height: 420 },
    generated: { projectId: record.projectId, publishedAt: record.publishedAt },
  }
}

let records: GeneratedAppRecord[] = typeof window === 'undefined' ? [] : loadRecords()
let snapshot: AppDefinition[] = [...builtinApplications, ...records.map(toDefinition)]
let byId = new Map(snapshot.map((app) => [app.id, app]))
const listeners = new Set<() => void>()

function commit(next: GeneratedAppRecord[]) {
  records = next
  snapshot = [...builtinApplications, ...records.map(toDefinition)]
  byId = new Map(snapshot.map((app) => [app.id, app]))
  saveRecords(records)
  listeners.forEach((listener) => listener())
}

/** Adds or updates (republishes) a generated application. */
export function registerGeneratedApp(record: GeneratedAppRecord) {
  const exists = records.some((r) => r.id === record.id)
  commit(exists ? records.map((r) => (r.id === record.id ? record : r)) : [...records, record])
}

export function getGeneratedApp(id: string): GeneratedAppRecord | undefined {
  return records.find((r) => r.id === id)
}

export function subscribeRegistry(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current list of every registered application (stable reference until it changes). */
export function listApps(): AppDefinition[] {
  return snapshot
}

// ── Queries ───────────────────────────────────────────────────────────────

export function getApp(id: AppId): AppDefinition {
  const app = byId.get(id)
  if (!app) throw new Error(`Unknown application: ${id}`)
  return app
}

/** Like getApp, but returns undefined for ids no longer registered (e.g. after a demo reset). */
export function findApp(id: string): AppDefinition | undefined {
  return byId.get(id as AppId)
}

export function getFolder(id: string): FolderDefinition | undefined {
  return folders.find((folder) => folder.id === id)
}

export function appsInFolder(id: DomainId, apps: AppDefinition[] = snapshot): AppDefinition[] {
  return apps.filter((app) => app.domains.includes(id))
}

export const businessApps = (apps: AppDefinition[] = snapshot) => apps.filter((app) => app.kind === 'application')
export const desktopShortcuts = (apps: AppDefinition[] = snapshot) => apps.filter((app) => app.desktopShortcut)
export const launcherApps = (apps: AppDefinition[] = snapshot) => apps.filter((app) => app.inLauncher)
export const pinnedApps = builtinApplications.filter((app) => app.pinned)
