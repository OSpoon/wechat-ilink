import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('API key management', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('requires authentication and a full-access token to manage keys', async ({ client }) => {
    const unauthorized = await client.get('/api/v1/account/api-keys')
    unauthorized.assertStatus(401)

    const unauthorizedCreate = await client.post('/api/v1/account/api-keys').json({
      name: 'Integration',
      access: 'read_only',
      expiresInDays: 30,
    })
    unauthorizedCreate.assertStatus(401)

    const password = 'Test-password-123'
    const signup = await client.post('/api/v1/auth/signup').json({
      fullName: 'API Key Test',
      email: `api-key-${randomUUID()}@example.com`,
      password,
      passwordConfirmation: password,
    })
    signup.assertStatus(200)
    const accountToken = (signup.body().data as { token: string }).token

    const created = await client
      .post('/api/v1/account/api-keys')
      .bearerToken(accountToken)
      .json({ name: 'Read only client', access: 'read_only', expiresInDays: 30 })
    created.assertStatus(201)
    const apiKey = (created.body() as { data: { token: string } }).data.token

    const scopedKeyListing = await client.get('/api/v1/account/api-keys').bearerToken(apiKey)
    scopedKeyListing.assertStatus(403)
  })

  test('creates scoped keys, hides their secrets, and revokes them', async ({ client, assert }) => {
    const password = 'Test-password-123'
    const signup = await client.post('/api/v1/auth/signup').json({
      fullName: 'API Key Test',
      email: `api-key-${randomUUID()}@example.com`,
      password,
      passwordConfirmation: password,
    })
    signup.assertStatus(200)
    const accountToken = (signup.body().data as { token: string }).token

    const readonlyResponse = await client
      .post('/api/v1/account/api-keys')
      .bearerToken(accountToken)
      .json({ name: 'Read only client', access: 'read_only', expiresInDays: 30 })
    readonlyResponse.assertStatus(201)
    const readonlyKey = (
      readonlyResponse.body() as {
        data: {
          id: number
          name: string
          abilities: string[]
          token: string
          expiresAt: string
        }
      }
    ).data
    assert.equal(readonlyKey.name, 'Read only client')
    assert.deepEqual(readonlyKey.abilities, ['api:read'])
    assert.isString(readonlyKey.token)
    assert.isAbove(Date.parse(readonlyKey.expiresAt), Date.now() + 29 * 24 * 60 * 60 * 1000)

    const listedKeys = await client.get('/api/v1/account/api-keys').bearerToken(accountToken)
    listedKeys.assertStatus(200)
    const listedKey = (listedKeys.body() as Array<Record<string, unknown>>)[0]!
    assert.equal(listedKey.name, 'Read only client')
    assert.notProperty(listedKey, 'token')

    const readonlyRead = await client.get('/api/v1/account/profile').bearerToken(readonlyKey.token)
    readonlyRead.assertStatus(200)

    const readonlyWrite = await client
      .patch('/api/v1/account/settings/account')
      .bearerToken(readonlyKey.token)
      .json({ name: 'Should be denied' })
    readonlyWrite.assertStatus(403)

    const readWriteResponse = await client
      .post('/api/v1/account/api-keys')
      .bearerToken(accountToken)
      .json({ name: 'Write client', access: 'read_write', expiresInDays: 7 })
    readWriteResponse.assertStatus(201)
    const readWriteKey = (
      readWriteResponse.body() as {
        data: {
          id: number
          abilities: string[]
          token: string
          expiresAt: string
        }
      }
    ).data
    assert.deepEqual(readWriteKey.abilities, ['api:read', 'api:write'])
    const expirationDays = (Date.parse(readWriteKey.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000)
    assert.isAbove(expirationDays, 6)
    assert.isBelow(expirationDays, 8)

    const readWriteMutation = await client
      .patch('/api/v1/account/settings/account')
      .bearerToken(readWriteKey.token)
      .json({ name: 'Updated by integration' })
    readWriteMutation.assertStatus(200)

    const revoked = await client
      .delete(`/api/v1/account/api-keys/${readonlyKey.id}`)
      .bearerToken(accountToken)
    revoked.assertStatus(204)

    const revokedRequest = await client
      .get('/api/v1/account/profile')
      .bearerToken(readonlyKey.token)
    revokedRequest.assertStatus(401)
  })

  test('rejects invalid access levels and expiration periods', async ({ client }) => {
    const password = 'Test-password-123'
    const signup = await client.post('/api/v1/auth/signup').json({
      fullName: 'API Key Test',
      email: `api-key-${randomUUID()}@example.com`,
      password,
      passwordConfirmation: password,
    })
    signup.assertStatus(200)
    const accountToken = (signup.body().data as { token: string }).token

    const invalidAccess = await client
      .post('/api/v1/account/api-keys')
      .bearerToken(accountToken)
      .json({ name: 'Invalid client', access: 'admin', expiresInDays: 14 })

    invalidAccess.assertStatus(422)

    const invalidExpiration = await client
      .post('/api/v1/account/api-keys')
      .bearerToken(accountToken)
      .json({ name: 'Invalid client', access: 'read_only', expiresInDays: 14 })

    invalidExpiration.assertStatus(422)
  })
})
