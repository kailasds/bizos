import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { claims as initialClaims, type Claim } from '@/data/claims.mock'
import { MockServicesContext, type ClaimDecision, type MockServicesValue } from './mock-services-context'

const DECISIONS_KEY = 'enterprise-ai-os:claim-decisions:v1'

function applyDecision(claim: Claim, decision: ClaimDecision, at: string): Claim {
  if (claim.stage !== 'awaiting-approval') return claim
  return {
    ...claim,
    stage: decision === 'approved' ? 'settled' : 'referred',
    slaHoursRemaining: 0,
    steps: claim.steps.map((step, i, all) =>
      i === all.length - 1
        ? { ...step, status: 'done', at, note: decision === 'approved' ? 'Approved by you.' : 'Referred to senior claims manager by you.' }
        : step,
    ),
  }
}

function loadDecisions(): Record<string, ClaimDecision> {
  try {
    const raw = window.localStorage.getItem(DECISIONS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ClaimDecision>) : {}
  } catch {
    return {}
  }
}

/** MOCK backend for Claims Intelligence. Simulated decisions persist locally across reloads. */
export function MockServicesProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, ClaimDecision>>(loadDecisions)

  const claims = useMemo(
    () => initialClaims.map((c) => (decisions[c.id] ? applyDecision(c, decisions[c.id], 'Earlier') : c)),
    [decisions],
  )

  const decideClaim = useCallback((claimId: string, decision: ClaimDecision) => {
    setDecisions((prev) => {
      const next = { ...prev, [claimId]: decision }
      try {
        window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable — the decision holds for this session.
      }
      return next
    })
  }, [])

  const value = useMemo<MockServicesValue>(
    () => ({
      claims,
      pendingApprovals: claims.filter((c) => c.stage === 'awaiting-approval'),
      decideClaim,
    }),
    [claims, decideClaim],
  )

  return <MockServicesContext.Provider value={value}>{children}</MockServicesContext.Provider>
}
