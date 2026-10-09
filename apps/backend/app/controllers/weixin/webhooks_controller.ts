import type { HttpContext } from '@adonisjs/core/http'
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
} from '#services/weixin/webhook_service'
import { createWebhookValidator } from '#validators/weixin'
import { ApiOperation, ApiResponse, ApiSchema, ApiSecurity } from '@foadonis/openapi/decorators'
import {
  ErrorResponseDocument,
  WebhookDeliveriesResponseDocument,
  WebhookResponseDocument,
  WebhooksResponseDocument,
} from '#openapi/schemas'

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinWebhooksController {
  @ApiOperation({
    summary: '查询 Webhook 列表',
    description: '返回当前 API 用户配置的账号级 Webhook。',
  })
  @ApiResponse({ status: 200, description: '返回 Webhook 列表。', type: WebhooksResponseDocument })
  async index({ auth, serialize }: HttpContext) {
    return await serialize(await listWebhooks(auth.getUserOrFail().id))
  }

  @ApiOperation({
    summary: '创建 Webhook',
    description: '为指定微信账号创建入站消息 Webhook，并使用密钥签名投递内容。',
  })
  @ApiSchema(createWebhookValidator)
  @ApiResponse({ status: 201, description: 'Webhook 创建成功。', type: WebhookResponseDocument })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  @ApiResponse({ status: 422, description: 'Webhook 参数校验失败。', type: ErrorResponseDocument })
  async store({ auth, request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createWebhookValidator)
    const endpoint = await createWebhook({
      userId: auth.getUserOrFail().id,
      accountId: payload.accountId,
      url: payload.url,
      secret: payload.secret,
      events: payload.events,
    })
    return response.created(await serialize(endpoint))
  }

  @ApiOperation({ summary: '删除 Webhook', description: '删除指定的 Webhook 配置。' })
  @ApiResponse({ status: 204, description: 'Webhook 配置已删除。' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在。', type: ErrorResponseDocument })
  async destroy({ auth, params, response }: HttpContext) {
    const deleted = await deleteWebhook(auth.getUserOrFail().id, params.webhookId)
    if (!deleted) {
      return response.notFound({
        error: { code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found' },
      })
    }
    return response.noContent()
  }

  @ApiOperation({
    summary: '查询 Webhook 投递记录',
    description: '返回指定 Webhook 的投递状态、尝试次数和最近错误。',
  })
  @ApiResponse({
    status: 200,
    description: '返回 Webhook 投递记录。',
    type: WebhookDeliveriesResponseDocument,
  })
  @ApiResponse({ status: 404, description: 'Webhook 不存在。', type: ErrorResponseDocument })
  async deliveries({ auth, params, response, serialize }: HttpContext) {
    const deliveries = await listWebhookDeliveries(auth.getUserOrFail().id, params.webhookId)
    if (!deliveries) {
      return response.notFound({
        error: { code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found' },
      })
    }
    return await serialize(deliveries)
  }
}
