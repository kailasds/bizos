import { getScenario } from '@/data/studio-scenarios.mock'
import { proposalFor } from './intelligence'
import type { StageId, StudioProject } from '../types'

export interface StageGuidance {
  doing: string
  why: string
  needs: string
  next: string
}

const selectedOption = (p: StudioProject) => p.architecture?.options.find((o) => o.id === p.architecture?.selectedOptionId)

/** The four things the user should always know (brief §13), per stage. */
export function stageGuidance(project: StudioProject | null, stage: StageId): StageGuidance {
  if (!project) {
    return {
      doing: 'Waiting for a description of the business problem.',
      why: 'Everything I design starts from the outcome you want, not from technical choices.',
      needs: 'Describe the problem in your own words and pick the domain.',
      next: 'I will tell you what I understood so you can correct it.',
    }
  }
  const option = selectedOption(project)
  const gaps = project.composition?.mappings.filter((m) => m.status === 'missing') ?? []
  const findings = project.validation?.findings ?? []
  const blocked = findings.filter((f) => f.status === 'blocked').length
  switch (stage) {
    case 'discover':
      return {
        doing: 'Interpreting your description against the domain pack.',
        why: 'A wrong interpretation would carry into every later decision.',
        needs: 'Correct, remove or add points until the list matches your intent.',
        next: 'I draft a structured requirement specification.',
      }
    case 'define':
      return {
        doing: 'Holding the requirement specification you will build from.',
        why: 'Solution approaches are only as good as the requirements they answer.',
        needs: 'Edit anything that is wrong and confirm. You do not need numerical targets.',
        next: 'I design alternative approaches with different levels of automation.',
      }
    case 'architect':
      return {
        doing: 'Comparing approaches against your confirmed requirements.',
        why: 'Each approach trades automation against new resources and change for your teams.',
        needs: option ? `Confirm “${option.name}”, or choose another.` : 'Choose the approach that fits how your teams want to work.',
        next: 'I check which existing resources can deliver it.',
      }
    case 'compose':
      return {
        doing: 'Mapping each need to an existing agent, worker, connector or domain pack.',
        why: 'Reusing approved resources is faster and safer than creating new ones.',
        needs: gaps.length ? `Decide whether I may compose ${gaps.map((g) => proposalFor(g.capabilityId)?.name ?? g.need).join(', ')}.` : 'Review the mapping and continue.',
        next: 'I compile your decisions into the Application Blueprint.',
      }
    case 'generate':
      return {
        doing: 'Showing the blueprint: workflow, resources, data, screens and permissions.',
        why: 'The blueprint is the single source of truth for what gets published.',
        needs: 'Check the screens and workflow make sense for your teams.',
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

/** Scripted architect replies. Deterministic keyword matching over project state — no model. */
export function architectReply(project: StudioProject | null, stage: StageId, question: string): string {
  const q = question.toLowerCase()
  if (!project) return 'Describe the business problem first. I will interpret it and show you what I understood.'
  const scenario = getScenario(project.scenarioId)
  const option = selectedOption(project)

  if (/summar|progress|where are we|status/.test(q)) {
    const done = Object.entries(project.progress).filter(([, v]) => v === 'complete').map(([k]) => k)
    const review = Object.entries(project.progress).filter(([, v]) => v === 'needs-review').map(([k]) => k)
    return `${project.name}: ${done.length ? `completed ${done.join(', ')}` : 'nothing confirmed yet'}.${review.length ? ` ${review.join(', ')} need${review.length === 1 ? 's' : ''} review after earlier changes.` : ''}${option ? ` Approach: ${option.name}.` : ''}`
  }
  if (/why|recommend/.test(q) && project.architecture) {
    const rec = project.architecture.options.find((o) => o.recommended)
    return rec
      ? `I recommend “${rec.name}” because ${rec.recommended!.reason.charAt(0).toLowerCase()}${rec.recommended!.reason.slice(1)} The trade-off: ${rec.tradeOffs[0].toLowerCase()}.`
      : 'No approach stands out; choose the one whose trade-offs suit your teams.'
  }
  if (/missing|forgot|gap|else/.test(q)) {
    const pending = (scenario?.suggestions ?? []).filter(
      (s) => !project.requirements?.[s.list].some((i) => i.id === s.item.id),
    )
    return pending.length
      ? `Worth considering: ${pending.map((s) => `“${s.item.label}” — ${s.reason}`).join(' ')} You can add these from my suggestions in Define.`
      : 'I have no further suggestions for the requirements.'
  }
  if (/worker|create|compose|new resource/.test(q)) {
    const gaps = project.composition?.mappings.filter((m) => m.status === 'missing') ?? []
    if (gaps.length) {
      const p = proposalFor(gaps[0].capabilityId)
      return `${gaps[0].need} has no existing resource. ${p ? `${p.whyNeeded} I checked ${p.reuseChecked.map((r) => r.resource).join(' and ')} first.` : ''}`
    }
    return 'No new resources are needed for the current approach.'
  }
  if (/approv|human|review/.test(q)) {
    return option
      ? `In “${option.name}”, a person decides: ${option.humanReview.join('; ').toLowerCase()}.`
      : 'Human review points depend on the approach you choose in Architect.'
  }
  const g = stageGuidance(project, stage)
  return `${g.doing} ${g.needs}`
}

export function explainRequirement(label: string, description?: string): string {
  return description
    ? `“${label}”: ${description} I included it because your description implies it; remove it if it is out of scope.`
    : `“${label}” is recorded as you wrote it. Tell me more in your own words if it needs to change.`
}
