import type { verifyToken } from '@clerk/backend'
import { errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'
import type User from '#models/user'
import { ClerkGuard } from '#auth/guards/clerk'

function createContext(authorization?: string) {
  return {
    request: {
      header: () => authorization,
    },
  } as unknown as HttpContext
}

test.group('Clerk auth guard', () => {
  test('authenticates a Clerk session and resolves its local user', async ({ assert }) => {
    const user = { id: 1, email: 'clerk@example.com' } as User
    let resolvedClerkUserId = ''
    const guard = new ClerkGuard(
      createContext('Bearer clerk-session-token'),
      { secretKey: 'sk_test_example' },
      {
        verifyToken: async () =>
          ({ sub: 'user_clerk_test' }) as Awaited<ReturnType<typeof verifyToken>>,
        identityService: {
          findOrCreateLocalUser: async (clerkUserId) => {
            resolvedClerkUserId = clerkUserId
            return user
          },
        },
      }
    )

    const authenticatedUser = await guard.authenticate()

    assert.equal(resolvedClerkUserId, 'user_clerk_test')
    assert.equal(authenticatedUser, user)
    assert.isTrue(guard.isAuthenticated)
  })

  test('rejects a request without a Clerk bearer token', async ({ assert }) => {
    const guard = new ClerkGuard(createContext(), { secretKey: 'sk_test_example' })

    let error: unknown
    try {
      await guard.authenticate()
    } catch (caught) {
      error = caught
    }

    assert.instanceOf(error, errors.E_UNAUTHORIZED_ACCESS)
    assert.isFalse(guard.isAuthenticated)
  })
})
