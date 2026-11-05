import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { claims as initialClaims, type Claim } from '@/data/claims.mock'
import { MockServicesContext, type ClaimDecision, type MockServicesValue } from './mock-services-context'

export function MockServicesProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims)

  const decideClaim = useCallback((claimId: string, decision: ClaimDecision) => {
    setClaims((list) =>
      list.map((claim) => {
        if (claim.id !== claimId || claim.stage !== 'awaiting-approval') return claim
        return {
          ...claim,
          stage: decision === 'approved' ? 'settled' : 'referred',
          slaHoursRemaining: 0,
          steps: claim.steps.map((step, i, all) =>
            i === all.length - 1
              ? {
                  ...step,
                  status: 'done',
                  at: 'Just now',
                  note: decision === 'approved' ? 'Approved by you.' : 'Referred to senior claims manager by you.',
                }
              : step,
          ),
        }
      }),
    )
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
