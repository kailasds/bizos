import { createContext } from 'react'
import type { Claim } from '@/data/claims.mock'

export type ClaimDecision = 'approved' | 'referred'

export interface MockServicesValue {
  claims: Claim[]
  /** Claims still waiting on a human decision. */
  pendingApprovals: Claim[]
  decideClaim: (claimId: string, decision: ClaimDecision) => void
}

/**
 * Stands in for backend services in Phase 1 so that applications and widgets read
 * the same (mock) state. Replace with API-backed data in a later phase.
 */
export const MockServicesContext = createContext<MockServicesValue | null>(null)
