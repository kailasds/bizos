/**
 * MOCK — shared plumbing for the simulated services in this folder.
 *
 * Every service here is deterministic and runs in the browser. Async functions return a
 * MockResult after a simulated latency so the UI can be written as if it called a real
 * API; replacing a service later means keeping its signature and swapping its body.
 */

export type MockResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

export const MOCK_LATENCY = { short: 450, medium: 700, long: 1800 } as const

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function simulate<T>(compute: () => MockResult<T>, ms: number = MOCK_LATENCY.medium): Promise<MockResult<T>> {
  await delay(ms)
  return compute()
}

export const ok = <T>(data: T): MockResult<T> => ({ ok: true, data })
export const fail = <T>(code: string, message: string): MockResult<T> => ({ ok: false, error: { code, message } })
