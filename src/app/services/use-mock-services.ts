import { useContext } from 'react'
import { MockServicesContext } from './mock-services-context'

export function useMockServices() {
  const ctx = useContext(MockServicesContext)
  if (!ctx) throw new Error('useMockServices must be used inside <MockServicesProvider>')
  return ctx
}
