import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Clerk session bridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('provides fresh Clerk tokens and the Clerk sign-out handler', async () => {
    const getToken = vi.fn().mockResolvedValue('clerk-session-token')
    const signOut = vi.fn().mockResolvedValue(undefined)
    const { registerClerkSession, requestClerkToken, signOutOfClerk } =
      await import('./clerk-session')

    registerClerkSession(getToken, signOut)

    await expect(requestClerkToken()).resolves.toBe('clerk-session-token')
    await signOutOfClerk()
    expect(getToken).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledOnce()
  })
})
