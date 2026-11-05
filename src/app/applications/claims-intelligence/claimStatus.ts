import type { StatusTone } from '@/components/os/StatusBadge'
import type { ClaimStage, RiskLevel } from '@/data/claims.mock'

export const stageTone: Record<ClaimStage, StatusTone> = {
  intake: 'info',
  coverage: 'info',
  'fraud-screening': 'info',
  assessment: 'info',
  'awaiting-approval': 'warning',
  settled: 'success',
  referred: 'neutral',
}

export const riskTone: Record<RiskLevel, StatusTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
}

export const riskLabel: Record<RiskLevel, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
}
