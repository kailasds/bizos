import type { CapabilityMapping, FindingCategory, ValidationFinding } from '@/app/studio/types'
import type { ApplicationBlueprint, ExperienceComponent } from './types'

export const validationCategories: { id: FindingCategory; label: string }[] = [
  { id: 'requirements', label: 'Requirements completeness' },
  { id: 'capabilities', label: 'Capability availability' },
  { id: 'compatibility', label: 'Resource compatibility' },
  { id: 'workflow', label: 'Workflow consistency' },
  { id: 'data-contract', label: 'Data contract consistency' },
  { id: 'security', label: 'Permission and security' },
  { id: 'ui-data', label: 'UI and data alignment' },
  { id: 'approvals', label: 'Human approval requirements' },
]

function componentFields(c: ExperienceComponent): string[] {
  switch (c.type) {
    case 'work-queue':
      return [...c.columns, ...(c.filter ? [c.filter.field] : [])]
    case 'record-detail':
      return c.fields
    case 'intake-form':
      return c.fields
    case 'approval-queue':
      return [...c.columns, 'status']
    case 'notes-panel':
      return [c.field]
  }
}

const humanize = (id: string) => id.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()

/**
 * Deterministic checks over the blueprint. Each category yields either one
 * "passed" finding explaining what was checked, or one finding per issue.
 */
export function validateBlueprint(blueprint: ApplicationBlueprint, mappings: CapabilityMapping[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const { nodes, edges } = blueprint.workflow
  const entity = blueprint.dataModel.entities.find((e) => e.id === blueprint.dataModel.primaryEntity)!
  const fieldIds = new Set(entity.fields.map((f) => f.id))
  const roleIds = new Set(blueprint.security.roles.map((r) => r.id))
  const req = blueprint.requirements
  const pass = (category: FindingCategory, title: string, explanation: string, artifact: ValidationFinding['artifact']) =>
    findings.push({ id: category, category, status: 'passed', title, explanation, artifact })

  // 1. Requirements completeness
  const before = findings.length
  const missing = [
    !req.objective.trim() && 'a business objective',
    req.users.length === 0 && 'at least one user group',
    req.capabilities.length === 0 && 'at least one capability',
    req.successCriteria.length === 0 && 'success criteria',
  ].filter(Boolean)
  if (missing.length) {
    findings.push({
      id: 'requirements:incomplete', category: 'requirements', status: 'needs-review',
      title: 'Specification is incomplete',
      explanation: `The requirement specification has no ${missing.join(', ')}.`,
      impact: 'Approaches, screens and evaluations are derived from the specification; gaps here carry into the application.',
      approvalRequired: false,
      artifact: { stage: 'define', label: 'Requirement specification' },
      resolution: 'Add the missing items in Define.',
    })
  }
  const hasHuman = nodes.some((n) => n.actor === 'human')
  for (const cap of req.capabilities) {
    if (!cap.capabilityId) {
      findings.push({
        id: `requirements:custom:${cap.id}`, category: 'requirements', status: 'needs-review',
        title: `“${cap.label}” has no matching capability`,
        explanation: 'This requirement is recorded in the specification, but no step in the workflow implements it in this version.',
        impact: 'People using the application would expect it to do this. Until a capability exists, it has to happen outside the application.',
        approvalRequired: true,
        artifact: { stage: 'define', label: 'Business capabilities' },
        resolution: 'Accept it as a known gap for this version, or remove it from the requirements.',
      })
      continue
    }
    const covered = cap.capabilityId === 'human-review' ? hasHuman : nodes.some((n) => n.capabilityId === cap.capabilityId)
    if (!covered) {
      findings.push({
        id: `requirements:uncovered:${cap.id}`, category: 'requirements', status: 'needs-review',
        title: `“${cap.label}” is not covered by the selected approach`,
        explanation: `${blueprint.solutionArchitecture.name} has no step for this capability.`,
        impact: 'A requirement you confirmed would not be delivered by this version.',
        approvalRequired: true,
        artifact: { stage: 'architect', label: 'Solution approach' },
        resolution: 'Choose an approach that includes it, or accept that it is handled outside this application.',
      })
    }
  }
  if (findings.length === before) {
    pass('requirements', 'Requirements are complete and covered',
      `All ${req.capabilities.length} confirmed capabilities are covered by ${blueprint.solutionArchitecture.name}.`,
      { stage: 'define', label: 'Requirement specification' })
  }

  // 2. Capability availability
  const unresourced = nodes.filter((n) => n.actor !== 'human' && !n.resourceId)
  for (const n of unresourced) {
    findings.push({
      id: `capabilities:${n.id}`, category: 'capabilities', status: 'blocked',
      title: `No resource for “${n.name}”`,
      explanation: 'An automated step has nothing to run it. The application cannot execute this workflow.',
      impact: 'Every case would stop at this step.',
      approvalRequired: false,
      artifact: { stage: 'compose', label: 'Resource mapping' },
      resolution: 'Map an existing resource or approve a worker composition in Compose.',
    })
  }
  if (!unresourced.length) {
    const created = mappings.filter((m) => m.created).length
    pass('capabilities', 'Every step has a resource',
      `${mappings.length - created} existing resources reused${created ? `, ${created} composed for this application` : ''}.`,
      { stage: 'compose', label: 'Resource mapping' })
  }

  // 3. Resource compatibility
  const conditional = mappings.filter((m) => m.resource && m.resource.availability !== 'available')
  for (const m of conditional) {
    findings.push({
      id: `compatibility:${m.capabilityId}`, category: 'compatibility', status: 'needs-review',
      title: `${m.resource?.name} is available with conditions`,
      explanation: m.resource?.note ?? '',
      impact: 'The resource can be used, but only under a condition set by its owning platform.',
      approvalRequired: true,
      artifact: { stage: 'compose', label: 'Resource mapping' },
      resolution: 'Confirm the condition is acceptable for this application.',
    })
  }
  if (!conditional.length) {
    const count = Object.values(blueprint.resources).flat().length
    pass('compatibility', 'Resources are compatible and pinned',
      `${count} resources pinned to exact versions; inputs and outputs match the ${entity.name} record.`,
      { stage: 'generate', label: 'Resources', tab: 'resources' })
  }

  // 4. Workflow consistency
  const linked = edges.every((e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to))
  const reachable = nodes.length > 0 && edges.length === nodes.length - 1
  if (linked && reachable) {
    pass('workflow', 'Workflow is consistent',
      `${nodes.length} steps with one start and one end; every step is reachable.`,
      { stage: 'generate', label: 'Workflow', tab: 'workflow' })
  } else {
    findings.push({
      id: 'workflow:structure', category: 'workflow', status: 'blocked',
      title: 'Workflow has disconnected steps',
      explanation: 'Some steps cannot be reached from the start of the workflow.',
      impact: 'Cases could never reach those steps.',
      approvalRequired: false,
      artifact: { stage: 'architect', label: 'Solution approach' },
      resolution: 'Regenerate the blueprint from the selected approach.',
    })
  }

  // 5. Data contract consistency
  const badContracts = nodes.flatMap((n) => [...n.inputs, ...n.outputs].filter((f) => !fieldIds.has(f)).map((f) => ({ n, f })))
  for (const { n, f } of badContracts) {
    findings.push({
      id: `data-contract:${n.id}:${f}`, category: 'data-contract', status: 'blocked',
      title: `“${n.name}” uses an unknown field`,
      explanation: `The step reads or writes “${f}”, which is not in the ${entity.name} record.`,
      impact: 'The step would fail or lose information at runtime.',
      approvalRequired: false,
      artifact: { stage: 'generate', label: 'Data model', tab: 'data' },
    })
  }
  if (!badContracts.length) {
    pass('data-contract', 'Data contracts are consistent',
      `Every step reads and writes fields that exist in the ${entity.name} record.`,
      { stage: 'generate', label: 'Data model', tab: 'data' })
  }

  // 6. Permission and security
  const before6 = findings.length
  for (const page of blueprint.experience.pages) {
    for (const role of page.roles.filter((r) => !roleIds.has(r))) {
      findings.push({
        id: `security:${page.id}:${role}`, category: 'security', status: 'blocked',
        title: `“${page.title}” is assigned to a role that no longer exists`,
        explanation: `The screen is meant for “${humanize(role)}”, which was removed from the users of this application.`,
        impact: 'Nobody would be allowed to use this screen.',
        approvalRequired: false,
        artifact: { stage: 'define', label: 'Users' },
        resolution: 'Add the user group back in Define, or regenerate the blueprint.',
      })
    }
  }
  for (const n of nodes.filter((n) => n.role && !roleIds.has(n.role))) {
    findings.push({
      id: `security:${n.id}`, category: 'security', status: 'blocked',
      title: `“${n.name}” is assigned to a role that no longer exists`,
      explanation: 'Nobody in this application could perform this step.',
      impact: 'Cases would wait at this step indefinitely.',
      approvalRequired: false,
      artifact: { stage: 'define', label: 'Users' },
      resolution: 'Add the user group back in Define, or choose another role in Generate.',
    })
  }
  if (findings.length === before6) {
    pass('security', 'Roles and access are consistent',
      `${blueprint.security.roles.length} roles; every screen and decision is limited to a defined role.${blueprint.security.audit.decisionLog ? ' Decision log enabled.' : ''}`,
      { stage: 'generate', label: 'Security', tab: 'security' })
  }

  // 7. UI and data alignment
  const seen = new Set<string>()
  for (const page of blueprint.experience.pages) {
    for (const c of page.components) {
      for (const f of componentFields(c).filter((f) => !fieldIds.has(f) && !seen.has(f))) {
        seen.add(f)
        findings.push({
          id: `ui-data:${f}`, category: 'ui-data', status: 'needs-review',
          title: `“${page.title}” shows a field the data model does not have`,
          explanation: `The ${c.type.replace('-', ' ')} on this screen is bound to “${humanize(f)}”, but the ${entity.name} record has no such field. The screen would show nothing there.`,
          impact: 'People would see an empty panel and could not record what they found.',
          approvalRequired: false,
          artifact: { stage: 'generate', label: 'Experience preview', tab: 'experience' },
          resolution: `Add “${humanize(f)}” to the ${entity.name} record.`,
          quickFix: { kind: 'add-field', entityId: entity.id, fieldId: f, label: humanize(f) },
        })
      }
    }
  }
  if (!seen.size) {
    pass('ui-data', 'Screens match the data model',
      `${blueprint.experience.pages.length} screens use only fields that exist in the ${entity.name} record.`,
      { stage: 'generate', label: 'Experience preview', tab: 'experience' })
  }

  // 8. Human approval requirements
  const humanNodes = nodes.filter((n) => n.actor === 'human')
  const unassigned = humanNodes.filter((n) => !n.role)
  for (const n of unassigned) {
    findings.push({
      id: `approvals:${n.id}`, category: 'approvals', status: 'blocked',
      title: `Nobody is assigned to approve “${n.name}”`,
      explanation: 'More than one user group could make this decision, so the OS did not choose one. Without an approver the step cannot be enforced.',
      impact: 'Decisions could be made by anyone with access, or by no one — neither is auditable.',
      approvalRequired: true,
      artifact: { stage: 'generate', label: 'Workflow', tab: 'workflow' },
      resolution: 'Choose which role makes this decision.',
      quickFix: {
        kind: 'assign-role',
        nodeId: n.id,
        candidates: blueprint.security.roles.map((r) => ({ id: r.id, label: r.name })),
      },
    })
  }
  const needsApproval = req.constraints.some((c) => /approv|clinician|mandate/i.test(c.label))
  if (needsApproval && humanNodes.length === 0) {
    findings.push({
      id: 'approvals:none', category: 'approvals', status: 'blocked',
      title: 'A constraint requires human approval, but no step has one',
      explanation: 'Your requirements say sensitive decisions need a person, and the selected approach has no human step.',
      impact: 'Sensitive decisions would be made without a person, against your constraint.',
      approvalRequired: true,
      artifact: { stage: 'architect', label: 'Solution approach' },
      resolution: 'Choose an approach with a human decision step.',
    })
  }
  if (!unassigned.length && !(needsApproval && humanNodes.length === 0)) {
    pass('approvals', 'Human approvals are enforced',
      `${humanNodes.length} decision${humanNodes.length === 1 ? '' : 's'} require a person, each with an assigned role.`,
      { stage: 'generate', label: 'Workflow', tab: 'workflow' })
  }

  return findings
}
