import type { HttpContext } from '@adonisjs/core/http'
import { ApiOperation, ApiResponse, ApiSchema, ApiSecurity } from '@foadonis/openapi/decorators'
import User from '#models/user'
import { createApiKeyValidator } from '#validators/api_key'
import {
  ApiKeyCreatedResponseDocument,
  ApiKeysResponseDocument,
  ErrorResponseDocument,
} from '#openapi/schemas'

const API_KEY_NAME_PREFIX = 'api-key:'

function toPublicApiKey(token: Awaited<ReturnType<typeof User.accessTokens.create>>) {
  return {
    id: token.identifier,
    name: token.name?.startsWith(API_KEY_NAME_PREFIX)
      ? token.name.slice(API_KEY_NAME_PREFIX.length)
      : token.name,
    abilities: token.abilities,
    createdAt: token.createdAt?.toISOString() ?? null,
    expiresAt: token.expiresAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  }
}

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
@ApiResponse({ status: 403, description: '需要完整权限的账号令牌。', type: ErrorResponseDocument })
export default class ApiKeysController {
  @ApiOperation({
    summary: '查询 API Key 列表',
    description: '返回当前用户创建的 API Key 元数据，不返回凭证明文。',
  })
  @ApiResponse({ status: 200, description: '返回 API Key 列表。', type: ApiKeysResponseDocument })
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const tokens = await User.accessTokens.all(user)
    const apiKeys = tokens
      .filter((token) => token.name?.startsWith(API_KEY_NAME_PREFIX))
      .map(toPublicApiKey)

    return serialize(apiKeys)
  }

  @ApiOperation({
    summary: '创建 API Key',
    description: '创建带有读取或读写权限及有效期的 API Key。完整凭证只在创建响应中返回一次。',
  })
  @ApiSchema(createApiKeyValidator)
  @ApiResponse({
    status: 201,
    description: 'API Key 创建成功。',
    type: ApiKeyCreatedResponseDocument,
  })
  @ApiResponse({ status: 422, description: 'API Key 参数校验失败。', type: ErrorResponseDocument })
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createApiKeyValidator)
    const abilities = payload.access === 'read_only' ? ['api:read'] : ['api:read', 'api:write']
    const token = await User.accessTokens.create(user, abilities, {
      name: `${API_KEY_NAME_PREFIX}${payload.name}`,
      expiresIn: `${payload.expiresInDays} days`,
    })

    return response.created({
      data: {
        ...toPublicApiKey(token),
        token: token.value!.release(),
      },
    })
  }

  @ApiOperation({ summary: '撤销 API Key', description: '撤销当前用户指定的 API Key。' })
  @ApiResponse({ status: 204, description: 'API Key 已撤销。' })
  @ApiResponse({ status: 404, description: 'API Key 不存在。', type: ErrorResponseDocument })
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const tokenId = Number(params.keyId)
    const tokens = Number.isSafeInteger(tokenId) ? await User.accessTokens.all(user) : []
    const token = tokens.find(
      (candidate) =>
        candidate.identifier === tokenId && candidate.name?.startsWith(API_KEY_NAME_PREFIX)
    )

    if (!token) {
      return response.notFound({
        error: { code: 'API_KEY_NOT_FOUND', message: 'API Key not found' },
      })
    }

    await User.accessTokens.delete(user, token.identifier)
    return response.noContent()
  }
}
