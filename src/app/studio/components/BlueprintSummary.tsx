import type { ReactNode } from 'react'
import type { ApplicationBlueprint } from '@/app/blueprint/types'
import { FlowDiagram } from './FlowDiagram'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** Compact, business-readable summary of a blueprint version (read-only). */
export function BlueprintSummary({ bp }: { bp: ApplicationBlueprint }) {
  const role = (id: string | null) => (id ? (bp.security.roles.find((r) => r.id === id)?.name ?? id) : null)
  return (
    <dl className="space-y-4">
      <Row label="Purpose">{bp.description}</Row>
      <Row label="Approach">{bp.solutionArchitecture.name}</Row>
      <Row label="Workflow">
        <FlowDiagram
          label={`Workflow of version ${bp.version}`}
          steps={bp.workflow.nodes.map((n) => ({ id: n.id, name: n.name, actor: n.actor, capabilityId: n.capabilityId, role: n.role }))}
          roleLabel={(id) => role(id) ?? id}
        />
      </Row>
      <Row label="Resources">
        {Object.values(bp.resources)
          .flat()
          .map((r) => `${r.name} ${r.version}${r.origin === 'created' ? ' (new)' : ''}`)
          .join(', ')}
      </Row>
      <Row label="Screens">{bp.experience.pages.map((p) => p.title).join(' · ')}</Row>
      <Row label="Approvals">
        {bp.security.approvals.map((a) => `${a.description} — ${role(a.role) ?? 'no approver'}`).join('; ') || 'None'}
      </Row>
      <Row label="Data">
        {bp.dataModel.entities.map((e) => `${e.name}: ${e.fields.map((f) => f.label).join(', ')}`).join(' · ')}
      </Row>
    </dl>
  )
}
