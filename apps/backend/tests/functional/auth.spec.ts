import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('authentication API', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('rejects access to WeChat accounts without a token', async ({ client }) => {
    const response = await client.get('/api/v1/weixin/accounts')

    response.assertStatus(401)
  })

  test('signs up, reads the profile, and revokes the access token', async ({ client, assert }) => {
    const email = `test-${randomUUID()}@example.com`
    const password = 'Test-password-123'

    const signup = await client.post('/api/v1/auth/signup').json({
      fullName: 'Workflow Test',
      email,
      password,
      passwordConfirmation: password,
    })

    signup.assertStatus(200)
    signup.assertBodyContains({ data: { user: { email } } })

    const token = (signup.body().data as { token: string }).token
    assert.isString(token)

    const profile = await client.get('/api/v1/account/profile').bearerToken(token)
    profile.assertStatus(200)
    profile.assertBodyContains({ data: { email } })

    const logout = await client.post('/api/v1/account/logout').bearerToken(token)
    logout.assertStatus(200)
    logout.assertBodyContains({ message: 'Logged out successfully' })

    const revokedProfile = await client.get('/api/v1/account/profile').bearerToken(token)
    revokedProfile.assertStatus(401)
  })
})
