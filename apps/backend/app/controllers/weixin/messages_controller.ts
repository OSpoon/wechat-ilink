import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import WeixinConversation from '#models/weixin_conversation'
import WeixinMessage from '#models/weixin_message'
import { sendTextMessageValidator } from '#validators/weixin'
import { accountToken, findAccountOrFail } from '#services/weixin/account_service'
import ILinkClient, { ILinkError } from '#services/weixin/ilink_client'
import { decryptSecret } from '#services/weixin/secret_service'
import { sanitizeProtocolPayload } from '#services/weixin/payload_sanitizer'
import {
  decodeMessagePayload,
  encodeMessagePayload,
} from '#services/weixin/message_payload_service'
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSchema,
  ApiSecurity,
} from '@foadonis/openapi/decorators'
import {
  ErrorResponseDocument,
  MessagesResponseDocument,
  SentMessageResponseDocument,
} from '#openapi/schemas'

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinMessagesController {
  @ApiOperation({
    summary: '查询消息历史',
    description: '返回指定微信账号的入站和出站消息，协议敏感字段会自动脱敏。',
  })
  @ApiQuery({
    name: 'limit',
    description: '返回消息数量，取值范围为 1 至 100。',
    type: 'integer',
    required: false,
    example: 50,
  })
  @ApiResponse({ status: 200, description: '返回消息历史。', type: MessagesResponseDocument })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  async index({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const account = await findAccountOrFail(user.id, params.accountId)
    const limit = Math.min(Math.max(Number(request.input('limit', 50)), 1), 100)
    const messages = await WeixinMessage.query()
      .where('account_id', account.id)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return await serialize(
      messages.map((message) => {
        const rawPayload = decodeMessagePayload<{ item_list?: unknown[] }>(message.payload)
        const payload = sanitizeProtocolPayload(rawPayload) as { item_list?: unknown[] }
        const media = (rawPayload.item_list ?? []).flatMap((item, index) => {
          if (!isMediaItem(item, message.direction)) return []
          return [
            {
              itemIndex: index,
              url: `/api/v1/weixin/accounts/${account.id}/messages/${message.id}/media/${index}`,
            },
          ]
        })
        return {
          id: message.id,
          direction: message.direction,
          from: message.fromUserId,
          to: message.toUserId,
          status: message.status,
          providerMessageId: message.providerMessageId,
          clientMessageId: message.clientMessageId,
          payload,
          media,
          receivedAt: message.receivedAt,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
        }
      })
    )
  }

  @ApiOperation({
    summary: '发送文本消息',
    description: '通过指定微信账号向目标用户发送文本消息。',
  })
  @ApiSchema(sendTextMessageValidator)
  @ApiResponse({
    status: 201,
    description: '文本消息发送成功。',
    type: SentMessageResponseDocument,
  })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  @ApiResponse({
    status: 409,
    description: '微信账号需要重新扫码登录。',
    type: ErrorResponseDocument,
  })
  @ApiResponse({ status: 422, description: '文本消息参数校验失败。', type: ErrorResponseDocument })
  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(sendTextMessageValidator)
    const account = await findAccountOrFail(user.id, params.accountId)

    if (account.status === 'reauth_required') {
      return response.status(409).send({
        error: { code: 'WEIXIN_REAUTH_REQUIRED', message: 'Weixin account requires QR re-login' },
      })
    }

    let contextToken = payload.contextToken
    if (!contextToken) {
      const conversation = await WeixinConversation.query()
        .where('account_id', account.id)
        .where('peer_user_id', payload.to)
        .first()
      if (conversation?.encryptedContextToken)
        contextToken = decryptSecret(conversation.encryptedContextToken)
    }

    const clientMessageId = payload.clientMessageId ?? randomUUID()
    const client = new ILinkClient({ baseUrl: account.baseUrl, token: accountToken(account) })
    try {
      await client.sendText(payload.to, payload.text, contextToken, clientMessageId, payload.runId)
    } catch (error) {
      await WeixinMessage.create({
        id: `wxmsg_${randomUUID()}`,
        accountId: account.id,
        providerMessageId: null,
        providerSeq: null,
        clientMessageId,
        direction: 'outbound',
        fromUserId: account.ilinkUserId,
        toUserId: payload.to,
        payload: encodeMessagePayload({ type: 'text', text: payload.text }),
        status: 'failed',
        errorCode:
          error instanceof ILinkError && error.code !== undefined ? String(error.code) : null,
      })
      throw error
    }

    const message = await WeixinMessage.create({
      id: `wxmsg_${randomUUID()}`,
      accountId: account.id,
      providerMessageId: null,
      providerSeq: null,
      clientMessageId,
      direction: 'outbound',
      fromUserId: account.ilinkUserId,
      toUserId: payload.to,
      payload: encodeMessagePayload({
        type: 'text',
        text: payload.text,
        contextToken: Boolean(contextToken),
        runId: payload.runId ?? null,
      }),
      status: 'sent',
      sentAt: DateTime.utc(),
    })
    await account.merge({ lastOutboundAt: DateTime.utc(), lastError: null }).save()

    return response.created(
      await serialize({
        id: message.id,
        clientMessageId,
        status: message.status,
        sentAt: message.sentAt,
      })
    )
  }
}

function isMediaItem(
  value: unknown,
  direction: 'inbound' | 'outbound'
): value is { type?: number } {
  if (!value || typeof value !== 'object') return false
  const item = value as {
    type?: unknown
    image_item?: { media?: unknown }
    voice_item?: { media?: unknown }
    file_item?: { media?: unknown }
    video_item?: { media?: unknown }
  }
  const type = String(item.type ?? '').toLowerCase()
  const typedMedia =
    type === '2' || type === 'image' || type === 'picture'
      ? item.image_item
      : type === '3' || type === 'voice' || type === 'audio'
        ? item.voice_item
        : type === '4' || type === 'file' || type === 'document'
          ? item.file_item
          : type === '5' || type === 'video'
            ? item.video_item
            : item.image_item || item.voice_item || item.file_item || item.video_item
  const media = typedMedia?.media
  if (!media || typeof media !== 'object') return false
  const reference = media as {
    full_url?: unknown
    encrypt_query_param?: unknown
    local_storage_key?: unknown
  }
  if (direction === 'outbound') {
    return (
      typeof reference.local_storage_key === 'string' &&
      reference.local_storage_key.trim().length > 0
    )
  }
  return Boolean(
    (typeof reference.full_url === 'string' && reference.full_url.trim()) ||
    (typeof reference.encrypt_query_param === 'string' && reference.encrypt_query_param.trim()) ||
    (typeof reference.local_storage_key === 'string' && reference.local_storage_key.trim())
  )
}
