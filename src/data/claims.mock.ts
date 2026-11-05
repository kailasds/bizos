/** Mock claims for the Claims Intelligence application. Fabricated — not real policyholders. */

export type ClaimStage =
  | 'intake'
  | 'coverage'
  | 'fraud-screening'
  | 'assessment'
  | 'awaiting-approval'
  | 'settled'
  | 'referred'

export type RiskLevel = 'low' | 'medium' | 'high'

export type StepStatus = 'done' | 'active' | 'pending' | 'flagged'

export interface ClaimStep {
  step: string
  status: StepStatus
  /** Agent, worker, rule engine or person that handled the step. */
  actor: string
  at?: string
  note?: string
}

export interface ClaimDocument {
  name: string
  kind: string
  status: 'verified' | 'needs-review' | 'missing'
}

export interface Claim {
  id: string
  claimant: string
  policyNumber: string
  product: 'Motor' | 'Home' | 'Commercial property' | 'Travel'
  lossType: string
  lossDate: string
  reportedAt: string
  amount: number
  stage: ClaimStage
  risk: RiskLevel
  riskSignals: string[]
  handler: string
  slaHoursRemaining: number
  summary: string
  documents: ClaimDocument[]
  steps: ClaimStep[]
  recommendation?: { decision: 'approve' | 'refer'; amount: number; rationale: string }
}

export const CLAIM_STAGE_ORDER: ClaimStage[] = [
  'intake',
  'coverage',
  'fraud-screening',
  'assessment',
  'awaiting-approval',
  'settled',
  'referred',
]

export const claimStageLabel: Record<ClaimStage, string> = {
  intake: 'Intake',
  coverage: 'Coverage check',
  'fraud-screening': 'Fraud screening',
  assessment: 'Assessment',
  'awaiting-approval': 'Awaiting approval',
  settled: 'Settled',
  referred: 'Referred',
}

const standardSteps = (upTo: number, overrides: Partial<Record<number, Partial<ClaimStep>>> = {}): ClaimStep[] => {
  const base: ClaimStep[] = [
    { step: 'First notice of loss captured', status: 'pending', actor: 'Intake Agent v1.8' },
    { step: 'Coverage validated against policy', status: 'pending', actor: 'Coverage Rules Engine v3.2' },
    { step: 'Fraud screening', status: 'pending', actor: 'Fraud Signals Worker v0.9' },
    { step: 'Damage assessment', status: 'pending', actor: 'Assessment Agent v2.1' },
    { step: 'Settlement decision', status: 'pending', actor: 'Claims handler (human approval)' },
  ]
  return base.map((s, i) => ({
    ...s,
    status: i < upTo ? 'done' : i === upTo ? 'active' : 'pending',
    ...overrides[i],
  }))
}

export const claims: Claim[] = [
  {
    id: 'CLM-24-1042',
    claimant: 'Harriet Okafor',
    policyNumber: 'MTR-883120',
    product: 'Motor',
    lossType: 'Rear-end collision',
    lossDate: '28 Oct 2026',
    reportedAt: '29 Oct 2026, 08:14',
    amount: 4820,
    stage: 'awaiting-approval',
    risk: 'low',
    riskSignals: [],
    handler: 'Priya Raman',
    slaHoursRemaining: 6,
    summary: 'Third party drove into the insured vehicle at a junction. Police reference supplied; repair estimate from an approved garage.',
    documents: [
      { name: 'Repair estimate — Northside Autos.pdf', kind: 'Repair estimate', status: 'verified' },
      { name: 'Scene photos (4)', kind: 'Photos', status: 'verified' },
      { name: 'Police report PR-55102.pdf', kind: 'Police report', status: 'verified' },
    ],
    steps: standardSteps(4, {
      0: { at: '29 Oct, 08:14' },
      1: { at: '29 Oct, 08:15', note: 'Comprehensive cover, £250 excess.' },
      2: { at: '29 Oct, 08:21', note: 'No signals above threshold.' },
      3: { at: '30 Oct, 11:02', note: 'Estimate within expected range for model and damage.' },
    }),
    recommendation: {
      decision: 'approve',
      amount: 4570,
      rationale: 'Covered peril, liability on third party, estimate within the expected range. Excess of £250 applied.',
    },
  },
  {
    id: 'CLM-24-1047',
    claimant: 'Tomasz Wiśniewski',
    policyNumber: 'HOM-210457',
    product: 'Home',
    lossType: 'Escape of water',
    lossDate: '25 Oct 2026',
    reportedAt: '26 Oct 2026, 19:40',
    amount: 12650,
    stage: 'awaiting-approval',
    risk: 'medium',
    riskSignals: ['Claim value above 75th percentile for peril', 'Policy amended 41 days before loss'],
    handler: 'Priya Raman',
    slaHoursRemaining: 20,
    summary: 'Burst pipe under kitchen floor. Damage to flooring, units and ceiling below. Loss adjuster visited on 31 Oct.',
    documents: [
      { name: 'Loss adjuster report.pdf', kind: 'Adjuster report', status: 'verified' },
      { name: 'Plumber invoice.pdf', kind: 'Invoice', status: 'verified' },
      { name: 'Contents list.xlsx', kind: 'Contents schedule', status: 'needs-review' },
    ],
    steps: standardSteps(4, {
      0: { at: '26 Oct, 19:40' },
      1: { at: '26 Oct, 19:41', note: 'Buildings and contents cover confirmed.' },
      2: { at: '26 Oct, 19:52', status: 'flagged', note: '2 medium signals — routed for human review.' },
      3: { at: '31 Oct, 16:20' },
    }),
    recommendation: {
      decision: 'approve',
      amount: 11900,
      rationale: 'Adjuster confirms cause. Signals explained by a documented kitchen renovation. Contents list partially unverified.',
    },
  },
  {
    id: 'CLM-24-1051',
    claimant: 'Brightwater Logistics Ltd',
    policyNumber: 'CPR-004418',
    product: 'Commercial property',
    lossType: 'Storm damage',
    lossDate: '02 Nov 2026',
    reportedAt: '02 Nov 2026, 10:05',
    amount: 38400,
    stage: 'awaiting-approval',
    risk: 'high',
    riskSignals: ['Exceeds handler authority limit', 'Business interruption component claimed'],
    handler: 'Daniel Mensah',
    slaHoursRemaining: 30,
    summary: 'Warehouse roof panels lifted during the 1 Nov storm. Stock damaged by water ingress. Business interruption claimed for 5 days.',
    documents: [
      { name: 'Roofing contractor quote.pdf', kind: 'Quote', status: 'verified' },
      { name: 'Stock loss schedule.xlsx', kind: 'Stock schedule', status: 'needs-review' },
      { name: 'Met Office storm report', kind: 'Weather evidence', status: 'verified' },
    ],
    steps: standardSteps(4, {
      0: { at: '02 Nov, 10:05' },
      1: { at: '02 Nov, 10:06' },
      2: { at: '02 Nov, 10:30' },
      3: { at: '04 Nov, 14:45', note: 'Business interruption estimated separately.' },
    }),
    recommendation: {
      decision: 'refer',
      amount: 38400,
      rationale: 'Value exceeds the handler authority limit of £25,000. Refer to senior claims manager.',
    },
  },
  {
    id: 'CLM-24-1053',
    claimant: 'Amara Lewis',
    policyNumber: 'TRV-771902',
    product: 'Travel',
    lossType: 'Lost baggage',
    lossDate: '30 Oct 2026',
    reportedAt: '03 Nov 2026, 09:12',
    amount: 960,
    stage: 'assessment',
    risk: 'low',
    riskSignals: [],
    handler: 'Unassigned',
    slaHoursRemaining: 44,
    summary: 'Checked bag not returned by the airline after a connecting flight. Airline property irregularity report attached.',
    documents: [
      { name: 'Property irregularity report.pdf', kind: 'Airline report', status: 'verified' },
      { name: 'Receipts (3)', kind: 'Receipts', status: 'needs-review' },
    ],
    steps: standardSteps(3, { 0: { at: '03 Nov, 09:12' }, 1: { at: '03 Nov, 09:13' }, 2: { at: '03 Nov, 09:15' } }),
  },
  {
    id: 'CLM-24-1055',
    claimant: 'Kwame Asante',
    policyNumber: 'MTR-902341',
    product: 'Motor',
    lossType: 'Windscreen damage',
    lossDate: '03 Nov 2026',
    reportedAt: '03 Nov 2026, 17:48',
    amount: 340,
    stage: 'settled',
    risk: 'low',
    riskSignals: [],
    handler: 'Straight-through',
    slaHoursRemaining: 0,
    summary: 'Chip in windscreen from road debris. Repaired by approved partner.',
    documents: [{ name: 'Repair invoice.pdf', kind: 'Invoice', status: 'verified' }],
    steps: standardSteps(5, {
      0: { at: '03 Nov, 17:48' },
      1: { at: '03 Nov, 17:48' },
      2: { at: '03 Nov, 17:49' },
      3: { at: '03 Nov, 17:49' },
      4: { at: '03 Nov, 17:50', actor: 'Auto-approval rule (under £500)' },
    }),
  },
  {
    id: 'CLM-24-1058',
    claimant: 'Sofia Marchetti',
    policyNumber: 'HOM-338812',
    product: 'Home',
    lossType: 'Theft from property',
    lossDate: '01 Nov 2026',
    reportedAt: '04 Nov 2026, 12:30',
    amount: 7200,
    stage: 'fraud-screening',
    risk: 'high',
    riskSignals: ['Reported 3 days after loss', 'Two prior theft claims in 24 months', 'High-value items without receipts'],
    handler: 'Daniel Mensah',
    slaHoursRemaining: 52,
    summary: 'Jewellery and electronics reported stolen during a break-in. No forced entry recorded in the crime reference.',
    documents: [
      { name: 'Crime reference letter.pdf', kind: 'Police report', status: 'verified' },
      { name: 'Item valuations', kind: 'Valuations', status: 'missing' },
    ],
    steps: standardSteps(2, {
      0: { at: '04 Nov, 12:30' },
      1: { at: '04 Nov, 12:31' },
      2: { status: 'flagged', note: '3 signals — investigation capability required.' },
    }),
  },
  {
    id: 'CLM-24-1060',
    claimant: 'Nadia Haddad',
    policyNumber: 'MTR-145098',
    product: 'Motor',
    lossType: 'Parking damage',
    lossDate: '04 Nov 2026',
    reportedAt: '05 Nov 2026, 07:55',
    amount: 1180,
    stage: 'coverage',
    risk: 'low',
    riskSignals: [],
    handler: 'Unassigned',
    slaHoursRemaining: 70,
    summary: 'Vehicle scraped by an unknown driver in a supermarket car park.',
    documents: [{ name: 'Photos (2)', kind: 'Photos', status: 'needs-review' }],
    steps: standardSteps(1, { 0: { at: '05 Nov, 07:55' } }),
  },
  {
    id: 'CLM-24-1061',
    claimant: 'Elliot Park',
    policyNumber: 'HOM-559021',
    product: 'Home',
    lossType: 'Accidental damage',
    lossDate: '05 Nov 2026',
    reportedAt: '05 Nov 2026, 09:20',
    amount: 650,
    stage: 'intake',
    risk: 'low',
    riskSignals: [],
    handler: 'Unassigned',
    slaHoursRemaining: 72,
    summary: 'Television knocked from its stand. Awaiting purchase receipt.',
    documents: [{ name: 'Purchase receipt', kind: 'Receipt', status: 'missing' }],
    steps: standardSteps(0),
  },
]

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value)
