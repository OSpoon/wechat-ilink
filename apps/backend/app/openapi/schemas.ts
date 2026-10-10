import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import {
  weixinAccountStatuses,
  weixinLoginSessionStatuses,
  weixinMessageDirections,
  weixinMessageStatuses,
  weixinWebhookDeliveryStatuses,
  weixinWebhookEvents,
  weixinTypingStatuses,
} from '#contracts/weixin'
import { mediaTypes } from '#services/weixin/media_service'

const dateTime = { type: String, format: 'date-time' as const }

export class ErrorDetailDocument {
  @ApiProperty({ type: String, example: 'RESOURCE_NOT_FOUND' })
  declare code: string

  @ApiProperty({ type: String, example: '请求的资源不存在。' })
  declare message: string
}

export class ErrorResponseDocument {
  @ApiProperty({ type: ErrorDetailDocument })
  declare error: ErrorDetailDocument
}

export class ServiceInfoDocument {
  @ApiProperty({ type: String, example: '欢迎使用微信 iLink API 服务。' })
  declare message: string
}

export class HealthLiveDocument {
  @ApiProperty({ type: String, example: 'ok' })
  declare status: string
}

export class HealthReadyDocument {
  @ApiProperty({ type: String, example: 'ok' })
  declare status: string

  @ApiProperty({ type: String, example: 'ok' })
  declare database: string
}

export class UserDocument {
  @ApiProperty({ type: Number, example: 1 })
  declare id: number

  @ApiProperty({ type: String, nullable: true, example: 'Test Developer' })
  declare fullName: string | null

  @ApiProperty({ type: String, format: 'email', example: 'name@example.com' })
  declare email: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:55:00.000Z' })
  declare createdAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:55:00.000Z' })
  declare updatedAt: string

  @ApiProperty({ type: String, example: 'TD' })
  declare initials: string
}

export class AuthDataDocument {
  @ApiProperty({ type: UserDocument })
  declare user: UserDocument

  @ApiProperty({ type: String, example: 'oat_xxx' })
  declare token: string
}

export class AuthResponseDocument {
  @ApiProperty({ type: AuthDataDocument })
  declare data: AuthDataDocument
}

export class UserResponseDocument {
  @ApiProperty({ type: UserDocument })
  declare data: UserDocument
}

export class ApiKeyDocument {
  @ApiProperty({ type: Number, example: 4 })
  declare id: number

  @ApiProperty({ type: String, example: 'Order sync service' })
  declare name: string

  @ApiProperty({ type: [String], example: ['api:read'] })
  declare abilities: string[]

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-10-10T08:00:00.000Z' })
  declare createdAt: string | null

  @ApiProperty({ ...dateTime, example: '2027-01-08T08:00:00.000Z' })
  declare expiresAt: string

  @ApiProperty({ ...dateTime, nullable: true, example: null })
  declare lastUsedAt: string | null
}

export class ApiKeyWithSecretDocument extends ApiKeyDocument {
  @ApiProperty({ type: String, example: 'oat_xxx', description: '仅创建时返回一次。' })
  declare token: string
}

export class ApiKeysResponseDocument {
  @ApiProperty({ type: [ApiKeyDocument] })
  declare data: ApiKeyDocument[]
}

export class ApiKeyCreatedResponseDocument {
  @ApiProperty({ type: ApiKeyWithSecretDocument })
  declare data: ApiKeyWithSecretDocument
}

export class MessageResponseDocument {
  @ApiProperty({ type: String, example: 'Logged out successfully' })
  declare message: string
}

export class AccountDocument {
  @ApiProperty({ type: String, example: 'wxacc_xxx' })
  declare id: string

  @ApiProperty({ type: String, example: 'ilink_bot_xxx' })
  declare providerAccountId: string

  @ApiProperty({ type: String, nullable: true, example: 'wxuser_xxx' })
  declare ilinkUserId: string | null

  @ApiProperty({ type: String, format: 'uri', example: 'https://ilinkai.weixin.qq.com' })
  declare baseUrl: string

  @ApiProperty({ type: String, format: 'uri', example: 'https://novac2c.cdn.weixin.qq.com/c2c' })
  declare cdnBaseUrl: string

  @ApiProperty({ enum: [...weixinAccountStatuses], example: 'running' })
  declare status: string

  @ApiProperty({ type: Boolean, example: true })
  declare enabled: boolean

  @ApiProperty({ type: String, nullable: true, example: null })
  declare lastError: string | null

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:55:00.000Z' })
  declare lastInboundAt: string | null

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:56:00.000Z' })
  declare lastOutboundAt: string | null

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:50:00.000Z' })
  declare createdAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:56:00.000Z' })
  declare updatedAt: string
}

export class AccountsResponseDocument {
  @ApiProperty({ type: [AccountDocument] })
  declare data: AccountDocument[]
}

export class AccountResponseDocument {
  @ApiProperty({ type: AccountDocument })
  declare data: AccountDocument
}

export class LoginSessionDocument {
  @ApiProperty({ type: String, example: 'wxlogin_xxx' })
  declare id: string

  @ApiProperty({ enum: [...weixinLoginSessionStatuses], example: 'waiting_scan' })
  declare status: string

  @ApiPropertyOptional({
    type: String,
    format: 'uri',
    example: 'https://ilinkai.weixin.qq.com/qr/xxx',
  })
  declare qrUrl?: string

  @ApiProperty({ type: String, nullable: true, example: 'wxacc_xxx' })
  declare accountId: string | null

  @ApiProperty({ type: String, nullable: true, example: 'wxuser_xxx' })
  declare ilinkUserId: string | null

  @ApiProperty({ type: String, nullable: true, example: null })
  declare errorMessage: string | null

  @ApiProperty({ ...dateTime, example: '2026-09-05T10:00:00.000Z' })
  declare expiresAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:55:00.000Z' })
  declare createdAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:56:00.000Z' })
  declare updatedAt: string
}

export class LoginSessionResponseDocument {
  @ApiProperty({ type: LoginSessionDocument })
  declare data: LoginSessionDocument
}

export class MediaReferenceDocument {
  @ApiProperty({ type: Number, example: 0 })
  declare itemIndex: number

  @ApiProperty({
    type: String,
    example: '/api/v1/weixin/accounts/wxacc_xxx/messages/wxmsg_xxx/media/0',
  })
  declare url: string
}

export class MessageDocument {
  @ApiProperty({ type: String, example: 'wxmsg_xxx' })
  declare id: string

  @ApiProperty({ enum: [...weixinMessageDirections], example: 'inbound' })
  declare direction: string

  @ApiProperty({ type: String, nullable: true, example: 'user_xxx' })
  declare from: string | null

  @ApiProperty({ type: String, nullable: true, example: 'wxuser_xxx' })
  declare to: string | null

  @ApiProperty({ enum: [...weixinMessageStatuses], example: 'received' })
  declare status: string

  @ApiProperty({ type: String, nullable: true, example: '123456' })
  declare providerMessageId: string | null

  @ApiProperty({ type: String, nullable: true, example: 'client-message-001' })
  declare clientMessageId: string | null

  @ApiProperty({ schema: { type: 'object', additionalProperties: true } })
  declare payload: Record<string, unknown>

  @ApiProperty({ type: [MediaReferenceDocument] })
  declare media: MediaReferenceDocument[]

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:55:00.000Z' })
  declare receivedAt: string | null

  @ApiProperty({ ...dateTime, nullable: true, example: null })
  declare sentAt: string | null

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:55:00.000Z' })
  declare createdAt: string
}

export class MessagesResponseDocument {
  @ApiProperty({ type: [MessageDocument] })
  declare data: MessageDocument[]
}

export class SentMessageDocument {
  @ApiProperty({ type: String, example: 'wxmsg_xxx' })
  declare id: string

  @ApiProperty({ type: String, example: 'client-message-001' })
  declare clientMessageId: string

  @ApiProperty({ enum: [...weixinMessageStatuses], example: 'sent' })
  declare status: string

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:56:00.000Z' })
  declare sentAt: string | null
}

export class SentMessageResponseDocument {
  @ApiProperty({ type: SentMessageDocument })
  declare data: SentMessageDocument
}

export class SentMediaDocument {
  @ApiProperty({ type: String, example: 'wxmsg_xxx' })
  declare id: string

  @ApiProperty({ type: String, example: 'client-message-001' })
  declare clientMessageId: string

  @ApiProperty({ enum: [...mediaTypes], example: 'image' })
  declare mediaType: string

  @ApiProperty({ enum: [...weixinMessageStatuses], example: 'sent' })
  declare status: string

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:56:00.000Z' })
  declare sentAt: string | null
}

export class SentMediaResponseDocument {
  @ApiProperty({ type: SentMediaDocument })
  declare data: SentMediaDocument
}

export class MediaUploadRequestDocument {
  @ApiProperty({ type: String, example: 'user_xxx' })
  declare to: string

  @ApiProperty({ enum: [...mediaTypes], example: 'image' })
  declare mediaType: string

  @ApiPropertyOptional({ type: String, example: '图片说明' })
  declare caption?: string

  @ApiPropertyOptional({ type: String, example: 'context-token-from-inbound-message' })
  declare contextToken?: string

  @ApiPropertyOptional({ type: String, example: 'client-message-001' })
  declare clientMessageId?: string

  @ApiPropertyOptional({ type: String, example: 'run-001' })
  declare runId?: string

  @ApiProperty({ type: String, format: 'binary' })
  declare file: string
}

export class TypingResultDocument {
  @ApiProperty({ type: String, example: 'user_xxx' })
  declare to: string

  @ApiProperty({ enum: [...weixinTypingStatuses], example: 1 })
  declare status: number
}

export class TypingResponseDocument {
  @ApiProperty({ type: TypingResultDocument })
  declare data: TypingResultDocument
}

export class WebhookDocument {
  @ApiProperty({ type: String, example: 'wxhook_xxx' })
  declare id: string

  @ApiProperty({ type: String, example: 'wxacc_xxx' })
  declare accountId: string

  @ApiProperty({
    type: String,
    format: 'uri',
    example: 'https://your-app.example.com/hooks/weixin',
  })
  declare url: string

  @ApiProperty({
    schema: {
      type: 'array',
      items: { type: 'string', enum: [...weixinWebhookEvents] },
    },
    example: ['message.received'],
  })
  declare events: string[]

  @ApiProperty({ type: Boolean, example: true })
  declare enabled: boolean

  @ApiProperty({ ...dateTime, nullable: true, example: null })
  declare lastDeliveryAt: string | null

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:50:00.000Z' })
  declare createdAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:50:00.000Z' })
  declare updatedAt: string
}

export class WebhooksResponseDocument {
  @ApiProperty({ type: [WebhookDocument] })
  declare data: WebhookDocument[]
}

export class WebhookResponseDocument {
  @ApiProperty({ type: WebhookDocument })
  declare data: WebhookDocument
}

export class WebhookDeliveryDocument {
  @ApiProperty({ type: String, example: 'wxdel_xxx' })
  declare id: string

  @ApiProperty({ enum: [...weixinWebhookEvents], example: 'message.received' })
  declare eventType: string

  @ApiProperty({ type: String, example: 'wxmsg_xxx' })
  declare eventId: string

  @ApiProperty({ enum: [...weixinWebhookDeliveryStatuses], example: 'delivered' })
  declare status: string

  @ApiProperty({ type: Number, example: 1 })
  declare attempts: number

  @ApiProperty({ type: String, nullable: true, example: null })
  declare lastError: string | null

  @ApiProperty({ ...dateTime, nullable: true, example: null })
  declare nextAttemptAt: string | null

  @ApiProperty({ ...dateTime, nullable: true, example: '2026-09-05T09:56:00.000Z' })
  declare deliveredAt: string | null

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:55:00.000Z' })
  declare createdAt: string

  @ApiProperty({ ...dateTime, example: '2026-09-05T09:56:00.000Z' })
  declare updatedAt: string
}

export class WebhookDeliveriesResponseDocument {
  @ApiProperty({ type: [WebhookDeliveryDocument] })
  declare data: WebhookDeliveryDocument[]
}
