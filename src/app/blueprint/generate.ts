import type { StudioScenario, CapabilityMapping } from '@/app/studio/types'
import type {
  ApplicationBlueprint,
  ApprovalRule,
  DataField,
  RequirementSpec,
  ResourceRef,
  Role,
  SolutionOption,
  WorkflowNode,
} from './types'

interface GenerateInput {
  projectId: string
  name: string
  scenario: StudioScenario
  requirements: RequirementSpec
  option: SolutionOption
  mappings: CapabilityMapping[]
  previous: ApplicationBlueprint | null
}

export function bumpVersion(version: string, part: 'minor' | 'patch'): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return part === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
}

/**
 * Compiles the approved decisions into an Application Blueprint. Deterministic:
 * stable ids for the application, nodes and resources; decisions the user made on a
 * previous version (approver roles, added data fields) carry over.
 */
export function generateBlueprint(input: GenerateInput): ApplicationBlueprint {
  const { scenario, requirements, option, mappings, previous } = input
  const projectNumber = input.projectId.replace(/\D/g, '') || '1'

  const mappingFor = (capabilityId: string) => mappings.find((m) => m.capabilityId === capabilityId)

  const nodes: WorkflowNode[] = option.steps.map((step) => {
    const id = `node-${step.id}`
    const needId = step.actor === 'human' ? 'human-task' : step.capabilityId
    const contract = scenario.contracts[step.capabilityId] ?? { inputs: [], outputs: [] }
    const previousRole = previous?.workflow.nodes.find((n) => n.id === id)?.role
    return {
      id,
      name: step.name,
      actor: step.actor,
      capabilityId: step.capabilityId,
      resourceId: mappingFor(needId)?.resource?.id ?? null,
      role: step.actor === 'human' ? (previousRole ?? step.role ?? null) : null,
      inputs: contract.inputs,
      outputs: contract.outputs,
    }
  })

  const edges = nodes.slice(1).map((node, i) => ({ id: `edge-${nodes[i].id}-${node.id}`, from: nodes[i].id, to: node.id }))

  const refs: ResourceRef[] = mappings
    .filter((m) => m.resource)
    .map((m) => ({
      id: m.resource!.id,
      name: m.resource!.name,
      version: m.resource!.version,
      kind: m.resource!.kind,
      owner: m.resource!.owner,
      capabilityIds: [m.capabilityId],
      origin: m.created ? 'created' : 'existing',
    }))
  const byKind = (kind: ResourceRef['kind']) => refs.filter((r) => r.kind === kind)

  // Screens follow both the requirements and the approach (e.g. monitoring adds an operations view).
  const capabilities = new Set([
    ...requirements.capabilities.map((c) => c.capabilityId).filter(Boolean),
    ...option.steps.map((s) => s.capabilityId),
  ])
  const pages = scenario.pages
    .filter((page) => !page.requires || capabilities.has(page.requires))
    .map(({ requires: _requires, ...page }) => page)

  // Keep fields the user added on a previous version.
  const addedFields: DataField[] =
    previous?.dataModel.entities
      .find((e) => e.id === scenario.entity.id)
      ?.fields.filter((f) => !scenario.entity.fields.some((sf) => sf.id === f.id)) ?? []
  const entity = { ...scenario.entity, fields: [...scenario.entity.fields, ...addedFields] }

  const roles: Role[] = requirements.users.map((user) => ({
    id: user.id,
    name: user.label,
    permissions: [
      ...pages.filter((p) => p.roles.includes(user.id)).map((p) => `view:${p.id}`),
      ...nodes.filter((n) => n.role === user.id).map((n) => `decide:${n.id}`),
    ],
  }))

  const approvals: ApprovalRule[] = nodes
    .filter((n) => n.actor === 'human')
    .map((n) => ({ id: `apr-${n.id}`, nodeId: n.id, description: n.name, role: n.role }))

  const constraintText = requirements.constraints.map((c) => c.label.toLowerCase()).join(' ')

  return {
    schemaVersion: '0.1',
    applicationId: previous?.applicationId ?? `app-${slug(scenario.defaultName)}-${projectNumber}`,
    name: input.name,
    description: scenario.description,
    domain: scenario.domain,
    domainPack: { id: `DP-${scenario.domain}`, version: scenario.domain === 'insurance' ? '0.1.0-draft' : 'planned' },
    status: 'draft',
    version: previous ? bumpVersion(previous.version, 'minor') : '0.1.0',
    requirements,
    solutionArchitecture: {
      optionId: option.id,
      name: option.name,
      summary: option.summary,
      automation: option.automation,
      humanCheckpoints: option.humanReview,
    },
    workflow: { id: `wf-${option.id}`, nodes, edges },
    resources: {
      agents: byKind('agent'),
      workers: byKind('worker'),
      connectors: byKind('connector'),
      services: byKind('service'),
      knowledge: byKind('knowledge'),
    },
    dataModel: { primaryEntity: entity.id, entities: [entity] },
    experience: { designSystem: 'enterprise-light', componentCatalogue: 'os-trusted-catalogue@0.1', pages },
    security: {
      roles,
      approvals,
      audit: {
        decisionLog: constraintText.includes('audit'),
        retention: constraintText.includes('retain') ? 'Regulatory period (to confirm)' : 'Not specified',
      },
    },
    evaluations: scenario.evaluations,
    deployment: { target: 'enterprise-ai-os-desktop', environment: 'prototype', folder: scenario.domain, runtime: 'mock-runtime' },
  }
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export type BlueprintPatch =
  | { kind: 'assign-role'; nodeId: string; role: string }
  | { kind: 'add-field'; entityId: string; field: DataField }
  /** Added by an accepted improvement proposal (Milestone 4). Workflows are linear, so edges are rebuilt in order. */
  | { kind: 'insert-step'; afterNodeId: string; node: WorkflowNode; description: string }

/** Applies a user edit to the blueprint and returns the next patch version. */
export function applyPatch(blueprint: ApplicationBlueprint, patch: BlueprintPatch): ApplicationBlueprint {
  const version = bumpVersion(blueprint.version, 'patch')
  if (patch.kind === 'insert-step') {
    if (blueprint.workflow.nodes.some((n) => n.id === patch.node.id)) return { ...blueprint, version, status: 'draft' }
    const at = blueprint.workflow.nodes.findIndex((n) => n.id === patch.afterNodeId)
    const nodes = [...blueprint.workflow.nodes]
    nodes.splice(at < 0 ? nodes.length : at + 1, 0, patch.node)
    const edges = nodes.slice(1).map((node, i) => ({ id: `edge-${nodes[i].id}-${node.id}`, from: nodes[i].id, to: node.id }))
    return { ...blueprint, version, status: 'draft', workflow: { ...blueprint.workflow, nodes, edges } }
  }
  if (patch.kind === 'assign-role') {
    const nodes = blueprint.workflow.nodes.map((n) => (n.id === patch.nodeId ? { ...n, role: patch.role } : n))
    return {
      ...blueprint,
      version,
      status: 'draft',
      workflow: { ...blueprint.workflow, nodes },
      security: {
        ...blueprint.security,
        approvals: blueprint.security.approvals.map((a) => (a.nodeId === patch.nodeId ? { ...a, role: patch.role } : a)),
        roles: blueprint.security.roles.map((r) =>
          r.id === patch.role && !r.permissions.includes(`decide:${patch.nodeId}`)
            ? { ...r, permissions: [...r.permissions, `decide:${patch.nodeId}`] }
            : r,
        ),
      },
    }
  }
  return {
    ...blueprint,
    version,
    status: 'draft',
    dataModel: {
      ...blueprint.dataModel,
      entities: blueprint.dataModel.entities.map((e) =>
        e.id === patch.entityId && !e.fields.some((f) => f.id === patch.field.id) ? { ...e, fields: [...e.fields, patch.field] } : e,
      ),
    },
  }
}

export function describePatch(blueprint: ApplicationBlueprint, patch: BlueprintPatch): string {
  if (patch.kind === 'assign-role') {
    const node = blueprint.workflow.nodes.find((n) => n.id === patch.nodeId)
    const role = blueprint.security.roles.find((r) => r.id === patch.role)
    return `Assigned ${role?.name ?? patch.role} to “${node?.name ?? patch.nodeId}”`
  }
  if (patch.kind === 'insert-step') {
    const after = blueprint.workflow.nodes.find((n) => n.id === patch.afterNodeId)
    return `Added workflow step “${patch.node.name}”${after ? ` after “${after.name}”` : ''}`
  }
  return `Added “${patch.field.label}” to the data model`
}
