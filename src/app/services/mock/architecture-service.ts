/**
 * MOCK — Solution Architecture Intelligence and the AI Architect (context.md Layer 3), simulated.
 *
 * Approaches come from scenario fixtures. The architect's replies are scripted: they are
 * assembled from the current project (scenario, requirements, selected approach, resource
 * gaps, blueprint, validation) by keyword intent — no model is called, and questions it has
 * no script for get an honest "here is what I can answer" reply.
 */

import type { FlowStep, RequirementSpec, SolutionOption } from '@/app/blueprint/types'
import type { ArchitectAction, StageId, StudioProject, StudioScenario } from '@/app/studio/types'
import { getScenario } from '@/data/studio-scenarios.mock'
import type { PlatformResource } from '@/data/resources.mock'
import { capabilityLabel, findResource, needOf, proposalFor } from './capability-analysis-service'
import { specCapabilityIds } from './intent-service'

export function buildOptions(scenario: StudioScenario, spec: RequirementSpec): SolutionOption[] {
  const caps = specCapabilityIds(spec)
  const approver = spec.approverRole ?? null
  return scenario.options.map((option) => ({
    ...option,
    steps: option.steps
      .filter((step) => !step.requires || caps.has(step.requires))
      .map(({ requires: _requires, ...step }) =>
        step.actor === 'human' && !step.role && approver && step.roleCandidates?.includes(approver) ? { ...step, role: approver } : step,
      ),
  }))
}

export interface StepInsight {
  step: FlowStep
  need: string
  resource: PlatformResource | null
  /** The resource exists but the selected approach would need a new worker instead. */
  missing: boolean
}

export interface ApproachInsights {
  humanSteps: FlowStep[]
  automatedSteps: FlowStep[]
  systemSteps: FlowStep[]
  steps: StepInsight[]
  /** Needs no existing resource covers (would need a new worker). */
  newResources: string[]
}

export function approachInsights(scenario: StudioScenario, option: SolutionOption): ApproachInsights {
  const steps = option.steps.map((step) => {
    const need = needOf(step)
    const resource = findResource(need, scenario.domain)
    return { step, need, resource, missing: !resource }
  })
  return {
    humanSteps: option.steps.filter((s) => s.actor === 'human'),
    automatedSteps: option.steps.filter((s) => s.actor === 'automated'),
    systemSteps: option.steps.filter((s) => s.actor === 'system'),
    steps,
    newResources: [...new Set(steps.filter((s) => s.missing).map((s) => capabilityLabel(scenario, s.need)))],
  }
}

// ── Stage guidance ──────────────────────────────────────────────────────

export interface StageGuidance {
  doing: string
  why: string
  needs: string
  next: string
}

const selectedOption = (p: StudioProject) => p.architecture?.options.find((o) => o.id === p.architecture?.selectedOptionId)

/** The four things the user should always know, per stage. */
export function stageGuidance(project: StudioProject | null, stage: StageId): StageGuidance {
  if (!project) {
    return {
      doing: 'Waiting for a description of the business problem.',
      why: 'Everything I design starts from the outcome you want, not from technical choices.',
      needs: 'Describe the problem in your own words and pick the domain.',
      next: 'I will show what I understood so you can correct it.',
    }
  }
  const option = selectedOption(project)
  const mappings = project.composition?.mappings ?? []
  const missing = mappings.filter((m) => m.status === 'missing')
  const unselected = mappings.filter((m) => m.status === 'available' || m.status === 'requires-configuration')
  const findings = project.validation?.findings ?? []
  const blocked = findings.filter((f) => f.status === 'blocked').length
  const pendingQuestions = project.discover.understanding?.questions.filter((q) => !q.answer).length ?? 0
  switch (stage) {
    case 'discover':
      return {
        doing: 'Showing what I understood from your description, grouped by topic.',
        why: 'A wrong interpretation would carry into every later decision.',
        needs: pendingQuestions ? `Check each group, and answer or skip ${pendingQuestions} question${pendingQuestions === 1 ? '' : 's'}.` : 'Check each group and correct anything that is wrong.',
        next: 'I turn this into a structured requirement specification.',
      }
    case 'define':
      return {
        doing: 'Holding the requirement specification you will build from.',
        why: 'Solution approaches are only as good as the requirements they answer.',
        needs: 'Edit anything that is wrong and confirm. You do not need numerical targets.',
        next: 'I design alternative approaches with different operating models.',
      }
    case 'architect':
      return {
        doing: 'Comparing approaches against your confirmed requirements.',
        why: 'Each approach is a different way of working: who does what, and what new resources it needs.',
        needs: option ? `Confirm “${option.name}”, or choose another.` : 'Choose the approach that fits how your teams want to work.',
        next: 'I check which existing resources can deliver it.',
      }
    case 'compose':
      return {
        doing: 'Mapping each need to an existing agent, worker, connector, service or domain pack.',
        why: 'Reusing approved resources is faster and safer than creating new ones.',
        needs: missing.length
          ? `Decide on ${missing.map((m) => proposalFor(m.capabilityId)?.name ?? m.need).join(', ')}.`
          : unselected.length
            ? `Select or configure ${unselected.length} resource${unselected.length === 1 ? '' : 's'}.`
            : 'Review the selection and generate the blueprint.',
        next: 'I compile your decisions into the Application Blueprint.',
      }
    case 'generate':
      return {
        doing: 'Showing the blueprint section by section.',
        why: 'The blueprint is the single source of truth for what gets published.',
        needs: 'Check that the workflow, screens and approvals make sense for your teams.',
        next: 'I validate the blueprint before anything can be published.',
      }
    case 'validate':
      return {
        doing: project.validation ? 'Reporting validation results.' : 'Ready to run validation checks.',
        why: 'Nothing is published until schemas, permissions, approvals and screens agree.',
        needs: blocked ? `Resolve ${blocked} blocking issue${blocked === 1 ? '' : 's'}.` : project.validation ? 'Review or accept the remaining findings.' : 'Run validation.',
        next: 'You review the application and publish it to the desktop.',
      }
    case 'publish':
      return {
        doing: project.publication ? 'The application is published.' : 'Preparing the final review.',
        why: 'Publishing registers the application so it opens like any other on this OS.',
        needs: project.publication ? 'Open it from the desktop, or keep improving this draft.' : 'Review the summary and publish.',
        next: project.publication ? 'Changes you make here stay in the draft until you publish again.' : 'The application appears on the desktop and in its domain folder.',
      }
  }
}

// ── Scripted replies ────────────────────────────────────────────────────

export interface ArchitectReply {
  text: string
  sources: string[]
  actions?: ArchitectAction[]
}

const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

export function suggestedQuestions(project: StudioProject | null, stage: StageId): string[] {
  const gap = project?.composition?.mappings.find((m) => m.status === 'missing')
  switch (stage) {
    case 'discover':
      return ['What did you understand?', 'What might be missing?']
    case 'define':
      return ['What might be missing?', 'Summarise progress']
    case 'architect':
      return ['Why is this approach recommended?', 'Can we reduce human intervention?', 'Explain the approval workflow']
    case 'compose':
      return [gap ? `Why is ${gap.need} required?` : 'Why reuse existing resources?', gap ? `What happens if ${gap.need} is unavailable?` : 'What happens if a worker is unavailable?', 'Explain the approval workflow']
    case 'generate':
      return ['What will be created?', 'Explain the approval workflow']
    case 'validate':
      return ['What blocks publishing?', 'Summarise progress']
    case 'publish':
      return ['What changes when I publish?', 'Summarise progress']
  }
}

export function architectReply(project: StudioProject | null, stage: StageId, question: string): ArchitectReply {
  const q = question.toLowerCase()
  if (!project) {
    return { text: 'Describe the business problem first. I will show what I understood so you can correct it.', sources: [] }
  }
  const scenario = getScenario(project.scenarioId)
  const spec = project.requirements
  const options = project.architecture?.options ?? []
  const selected = selectedOption(project)
  const recommended = options.find((o) => o.recommended)
  const current = selected ?? recommended
  const roleName = (id: string | null | undefined) => (id ? (spec?.users.find((u) => u.id === id)?.label ?? id) : null)
  const specSource = spec ? `Requirement specification v${spec.version}` : 'Your description'
  const approachSource = current ? `Approach: ${current.name}${selected ? '' : ' (recommended, not yet selected)'}` : ''
  const sources = (...s: string[]) => s.filter(Boolean)

  // Summarise progress
  if (/summar|progress|where are we/.test(q)) {
    const done = Object.entries(project.progress).filter(([, v]) => v === 'complete').map(([k]) => k)
    const review = Object.entries(project.progress).filter(([, v]) => v === 'needs-review').map(([k]) => k)
    return {
      text: `${project.name}: ${done.length ? `${list(done)} ${done.length === 1 ? 'is' : 'are'} confirmed` : 'nothing is confirmed yet'}.${review.length ? ` ${list(review)} need${review.length === 1 ? 's' : ''} review after earlier changes.` : ''}${selected ? ` Approach: ${selected.name}.` : ''}${project.blueprint ? ` Blueprint v${project.blueprint.version}.` : ''}`,
      sources: sources('Project state'),
    }
  }

  // What did you understand?
  if (/understand|interpret/.test(q)) {
    const u = project.discover.understanding
    if (!u) return { text: 'I have not interpreted a description yet.', sources: [] }
    const caps = u.items.filter((i) => i.kind === 'capability').map((i) => i.text.replace(/\.$/, '').toLowerCase())
    return {
      text: `${u.summary} In practice: ${list(caps)}.${u.matchedPhrases.length ? ` I based this on your words “${u.matchedPhrases.slice(0, 2).join('”, “')}” and the ${scenario?.domain ?? ''} domain pack.` : ''}`,
      sources: sources('Your description', scenario ? `${scenario.label} scenario` : ''),
    }
  }

  // Reduce human intervention
  if (/(reduce|fewer|less|minimi[sz]e|cut).*(human|people|manual|intervention|hand-?off)|more automat/.test(q)) {
    if (!current || !scenario) return { text: 'Choose a solution approach first; human involvement depends on it.', sources: sources(specSource) }
    const humans = current.steps.filter((s) => s.actor === 'human')
    const alternative = options
      .filter((o) => o.id !== current.id)
      .map((o) => ({ o, n: o.steps.filter((s) => s.actor === 'human').length / o.steps.length }))
      .filter(({ n }) => n < humans.length / current.steps.length)
      .sort((a, b) => a.n - b.n)[0]?.o
    const approvalConstraint = spec?.constraints.find((c) => /approv|clinician|mandate/i.test(c.label))
    const floor = approvalConstraint ? ` Your constraint “${approvalConstraint.label}” means at least one person stays in every sensitive decision, so human approval cannot be removed entirely.` : ''
    if (!alternative) {
      return {
        text: `“${current.name}” is already the most automated approach: people do ${humans.length} of ${current.steps.length} steps (${list(humans.map((s) => s.name))}).${floor}`,
        sources: sources(specSource, approachSource),
      }
    }
    const altHumans = alternative.steps.filter((s) => s.actor === 'human')
    const altNew = approachInsights(scenario, alternative).newResources
    return {
      text: `In “${current.name}”, people do ${humans.length} of ${current.steps.length} steps: ${list(humans.map((s) => s.name))}. “${alternative.name}” has people on ${altHumans.length} of ${alternative.steps.length}: ${list(altHumans.map((s) => s.name))}.${altNew.length ? ` It needs ${list(altNew)}, which no existing resource provides.` : ''}${floor}`,
      sources: sources(specSource, approachSource, 'Resource catalogue'),
      actions: [{ label: `Look at ${alternative.name}`, kind: 'focus-option', optionId: alternative.id }],
    }
  }

  // What happens if a capability is unavailable?
  if (/unavailable|what if|without|not available|reject|decline|don.?t create/.test(q)) {
    if (!current || !scenario) return { text: 'Choose a solution approach first; the impact depends on which capabilities it uses.', sources: [] }
    const needs = [...new Set([...current.steps.map((s) => needOf(s)), ...current.supportingCapabilities])]
    const named = needs.find((n) => q.includes(capabilityLabel(scenario, n).toLowerCase()))
    const gap = project.composition?.mappings.find((m) => m.status === 'missing')?.capabilityId
    const target = named ?? gap ?? needs.find((n) => proposalFor(n))
    if (!target) return { text: `Every need in “${current.name}” has an existing resource. If one became unavailable, validation would block publishing until another is mapped.`, sources: sources(approachSource, 'Resource catalogue') }
    const steps = current.steps.filter((s) => needOf(s) === target).map((s) => s.name)
    const proposal = proposalFor(target)
    if (proposal) {
      const alternative = options.find((o) => o.id !== current.id && !o.steps.some((s) => needOf(s) === target))
      return {
        text: `Without ${capabilityLabel(scenario, target)}, ${steps.length ? `“${list(steps)}” would have nothing to run it` : 'the approach would be incomplete'}. ${proposal.ifRejected}`,
        sources: sources(approachSource, 'Resource catalogue'),
        actions: alternative ? [{ label: `Look at ${alternative.name}`, kind: 'focus-option', optionId: alternative.id }] : undefined,
      }
    }
    const resource = findResource(target, scenario.domain)
    return {
      text: `${capabilityLabel(scenario, target)} is provided by ${resource?.name ?? 'an existing resource'}. If it became unavailable, ${steps.length ? `“${list(steps)}”` : 'this need'} would have no resource and validation would block publishing until another resource is mapped. The published version keeps its pinned resource version.`,
      sources: sources(approachSource, 'Resource catalogue'),
    }
  }

  // Explain the approval workflow
  if (/approv|who decides|sign.?off|human review|checkpoint/.test(q)) {
    const nodes = project.blueprint?.workflow.nodes.filter((n) => n.actor === 'human')
    const steps = nodes ?? current?.steps.filter((s) => s.actor === 'human') ?? []
    if (!steps.length) return { text: 'Human review points depend on the approach you choose in Architect.', sources: sources(specSource) }
    const lines = steps.map((s, i) => `${i + 1}) ${s.name} — ${roleName(s.role) ?? 'approver not chosen yet'}`)
    const unassigned = steps.filter((s) => !s.role).length
    return {
      text: `${current ? `In “${current.name}”, ` : ''}people decide at ${steps.length} point${steps.length === 1 ? '' : 's'}: ${lines.join('; ')}. Each decision is recorded with its reason by the Approval Service.${unassigned ? ` ${unassigned === 1 ? 'One decision has' : `${unassigned} decisions have`} no approver yet — more than one user group could decide, so I did not choose. Validation will block publishing until you do.` : ''}`,
      sources: sources(approachSource, project.blueprint ? `Blueprint v${project.blueprint.version}` : '', spec ? 'Constraints' : ''),
      actions: unassigned && project.blueprint ? [{ label: 'Assign approvers', kind: 'go-stage', stage: 'generate' }] : undefined,
    }
  }

  // Why is a capability / worker required?
  if (/why/.test(q) && /(required|needed|need|necessary|include|part of)/.test(q) && scenario) {
    const candidates = [
      ...new Set([
        ...options.flatMap((o) => [...o.steps.map((st) => needOf(st)), ...o.supportingCapabilities]),
        ...Object.keys(scenario.capabilityLabels),
      ]),
    ]
    const named = candidates
      .map((id) => ({ id, label: capabilityLabel(scenario, id) }))
      .filter(({ id, label }) => q.includes(label.toLowerCase()) || (proposalFor(id) && q.includes(proposalFor(id)!.name.toLowerCase().replace(/ worker$/, ''))))
      .sort((a, b) => b.label.length - a.label.length)[0]
    if (named) {
      const label = capabilityLabel(scenario, named.id)
      const steps = current?.steps.filter((st) => needOf(st) === named.id).map((st) => st.name) ?? []
      const fromSpec = spec?.capabilities.find((c) => c.capabilityId === named.id)
      const mapping = project.composition?.mappings.find((m) => m.capabilityId === named.id)
      const proposal = proposalFor(named.id)
      const resource = findResource(named.id, scenario.domain)
      const usedBy = current && !steps.length && !current.supportingCapabilities.includes(named.id)
      if (usedBy) {
        const other = options.find((o) => o.steps.some((st) => needOf(st) === named.id))
        return {
          text: `“${current.name}” does not use ${label}.${other ? ` It appears in “${other.name}”, where ${list(other.steps.filter((st) => needOf(st) === named.id).map((st) => `“${st.name}”`))} depend${other.steps.filter((st) => needOf(st) === named.id).length === 1 ? 's' : ''} on it.` : ''}`,
          sources: sources(approachSource),
          actions: other ? [{ label: `Look at ${other.name}`, kind: 'focus-option', optionId: other.id }] : undefined,
        }
      }
      const why = fromSpec
        ? `your requirement “${fromSpec.label}” asks for it`
        : steps.length
          ? `the approach includes ${list(steps.map((st) => `“${st}”`))}`
          : 'the approach relies on it throughout'
      const provided = mapping?.resource ?? (mapping ? null : resource)
      const provider = mapping?.created
        ? ` ${mapping.resource?.name ?? proposal?.name ?? 'A new worker'} was composed for this application (simulated — nothing was created on the AI Workers Platform).`
        : mapping?.status === 'missing' || (!provided && proposal)
          ? ` No existing resource provides it, so I suggest composing ${proposal?.name ?? 'a new worker'} (simulated). ${proposal?.whyNeeded ?? ''}`
          : provided
            ? ` It is provided by ${provided.name}.`
            : ''
      return {
        text: `${label} is required because ${why}${steps.length && fromSpec ? `, carried out in ${list(steps.map((st) => `“${st}”`))}` : ''}.${provider}${proposal && !mapping?.created ? ` If you would rather not add it: ${proposal.ifRejected}` : ''}`,
        sources: sources(fromSpec ? specSource : '', approachSource, 'Resource catalogue'),
        actions: stage !== 'compose' && project.progress.architect === 'complete' ? [{ label: 'Review in Compose', kind: 'go-stage', stage: 'compose' }] : undefined,
      }
    }
  }

  // Why recommended
  if (/why|recommend/.test(q) && options.length) {
    if (!recommended) return { text: 'No approach stands out; choose the one whose trade-offs suit your teams.', sources: sources(specSource) }
    const chose = selected && selected.id !== recommended.id ? ` You selected “${selected.name}”: ${selected.tradeOffs[0].toLowerCase()}, compared with “${recommended.name}”: ${recommended.tradeOffs[0].toLowerCase()}.` : ''
    return {
      text: `I recommend “${recommended.name}” because ${recommended.recommended!.reason.charAt(0).toLowerCase()}${recommended.recommended!.reason.slice(1)} ${recommended.operatingModel ?? ''} The main trade-off: ${recommended.tradeOffs[0].toLowerCase()}.${chose}`,
      sources: sources(specSource, `${scenario?.label ?? ''} approaches`),
      actions: selected?.id === recommended.id ? undefined : [{ label: `Look at ${recommended.name}`, kind: 'focus-option', optionId: recommended.id }],
    }
  }

  // Compare approaches
  if (/compare|difference|versus|\bvs\b/.test(q) && options.length && scenario) {
    return {
      text: options
        .map((o) => {
          const i = approachInsights(scenario, o)
          return `“${o.name}”: ${o.operatingModel ?? o.tagline} People do ${i.humanSteps.length} of ${o.steps.length} steps${i.newResources.length ? `; needs ${list(i.newResources)}` : '; no new resources'}.`
        })
        .join(' '),
      sources: sources(specSource, 'Resource catalogue'),
    }
  }

  // Missing / gaps
  if (/missing|gap|forgot|else/.test(q)) {
    if (stage === 'compose' || stage === 'validate') {
      const gaps = project.composition?.mappings.filter((m) => m.status === 'missing') ?? []
      if (gaps.length) return { text: `${list(gaps.map((g) => g.need))} ${gaps.length === 1 ? 'has' : 'have'} no existing resource. ${proposalFor(gaps[0].capabilityId)?.whyNeeded ?? ''}`, sources: sources(approachSource, 'Resource catalogue') }
    }
    const pending = project.discover.understanding?.suggestions.filter((s) => s.status === 'pending') ?? []
    return pending.length
      ? { text: `Worth considering: ${pending.map((s) => `“${s.text}” — ${s.reason}`).join(' ')}`, sources: sources(`${scenario?.label ?? ''} domain pack`), actions: [{ label: 'Review in Discover', kind: 'go-stage', stage: 'discover' }] }
      : { text: 'I have no further suggestions for the requirements.', sources: sources(specSource) }
  }

  // What blocks publishing?
  if (/block|stop|prevent/.test(q)) {
    const blocked = project.validation?.findings.filter((f) => f.status === 'blocked') ?? []
    if (!project.validation) return { text: 'Validation has not run yet, so I cannot say. Run it in Validate.', sources: [], actions: [{ label: 'Go to Validate', kind: 'go-stage', stage: 'validate' }] }
    return blocked.length
      ? { text: `${blocked.length} issue${blocked.length === 1 ? '' : 's'} block${blocked.length === 1 ? 's' : ''} publishing: ${blocked.map((f) => f.title).join('; ')}.`, sources: sources(`Validation of v${project.validation.blueprintVersion}`) }
      : { text: 'Nothing blocks publishing. Remaining findings, if any, can be accepted as known gaps.', sources: sources(`Validation of v${project.validation.blueprintVersion}`) }
  }

  // Publishing
  if (/publish|release|deploy/.test(q)) {
    return {
      text: `Publishing registers ${project.name} with this OS: it appears on the desktop, in the ${project.discover.domain ?? 'domain'} folder and in the launcher, and opens as its own window. The published version is pinned; later edits stay in this draft until you publish again. Deployment is simulated — no external infrastructure is used.`,
      sources: sources(project.blueprint ? `Blueprint v${project.blueprint.version}` : ''),
    }
  }

  // What will be created
  if (/create|what will|build|screens|generate/.test(q)) {
    const bp = project.blueprint
    if (bp) {
      return {
        text: `${bp.name}: ${bp.workflow.nodes.length} workflow steps, ${bp.experience.pages.length} screens (${list(bp.experience.pages.map((p) => p.title))}), ${Object.values(bp.resources).flat().length} pinned resources and ${bp.security.roles.length} roles.`,
        sources: sources(`Blueprint v${bp.version}`),
      }
    }
    return { text: current ? `An application that follows “${current.name}”. The exact screens are generated once resources are confirmed in Compose.` : 'That depends on the approach you choose.', sources: sources(approachSource) }
  }

  if (/reuse/.test(q)) {
    return { text: 'Existing resources are already approved, versioned and monitored by their platforms. Reusing them avoids composing and validating something new, and keeps one source of truth for each capability.', sources: ['Platform principles (context.md)'] }
  }

  const g = stageGuidance(project, stage)
  return {
    text: `${g.doing} ${g.needs} I have scripted answers about why an approach is recommended, why a capability is required, reducing human intervention, what happens if a worker or capability is unavailable, and the approval workflow.`,
    sources: [],
  }
}

export function explainRequirement(label: string, description?: string): ArchitectReply {
  return description
    ? { text: `“${label}”: ${description} I included it because your description implies it; remove it if it is out of scope.`, sources: ['Domain pack'] }
    : { text: `“${label}” is recorded as you wrote it. Tell me more in your own words if it needs to change.`, sources: ['Your input'] }
}
