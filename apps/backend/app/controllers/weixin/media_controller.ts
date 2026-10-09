import path from 'node:path'
import { stat as statFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import WeixinMessage from '#models/weixin_message'
import { accountToken, findAccountOrFail } from '#services/weixin/account_service'
import { uploadAndSendMedia } from '#services/weixin/media_service'
import ILinkClient, { ILinkError } from '#services/weixin/ilink_client'
import { decryptSecret } from '#services/weixin/secret_service'
import WeixinConversation from '#models/weixin_conversation'
import { sendMediaMessageValidator } from '#validators/weixin'
import { encodeMessagePayload } from '#services/weixin/message_payload_service'
import {
  attachLocalMediaReference,
  removeLocalMedia,
  storeOutboundMedia,
} from '#services/weixin/local_media_service'
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import {
  ErrorResponseDocument,
  MediaUploadRequestDocument,
  SentMediaResponseDocument,
} from '#openapi/schemas'

const MAX_MEDIA_SIZE = 20 * 1024 * 1024

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinMediaController {
  @ApiOperation({
    summary: '发送图片、视频或文件',
    description: '加密上传媒体到微信 CDN，然后通过 iLink 发送媒体消息。',
  })
  @ApiBody({
    type: MediaUploadRequestDocument,
    mediaType: 'multipart/form-data',
    required: true,
  })
  @ApiResponse({ status: 201, description: '媒体消息发送成功。', type: SentMediaResponseDocument })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  @ApiResponse({
    status: 409,
    description: '微信账号需要重新扫码登录。',
    type: ErrorResponseDocument,
  })
  @ApiResponse({
    status: 422,
    description: '媒体文件或参数校验失败。',
    type: ErrorResponseDocument,
  })
  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(sendMediaMessageValidator)
    const account = await findAccountOrFail(user.id, params.accountId)
    if (account.status === 'reauth_required') {
      return response.status(409).send({
        error: { code: 'WEIXIN_REAUTH_REQUIRED', message: 'Weixin account requires QR re-login' },
      })
    }

    const file = request.file('file')
    if (!file) {
      return response.unprocessableEntity({
        error: { code: 'MEDIA_FILE_REQUIRED', message: 'multipart field "file" is required' },
      })
    }
    file.sizeLimit = MAX_MEDIA_SIZE
    file.validate()
    if (!file.isValid || !file.tmpPath) {
      return response.unprocessableEntity({
        error: {
          code: 'MEDIA_FILE_INVALID',
          message:
            file.errors.map((error) => error.message).join('; ') || 'uploaded file is invalid',
        },
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

    const clientMessageId = payload.clientMessageId || randomUUID()
    const client = new ILinkClient({ baseUrl: account.baseUrl, token: accountToken(account) })
    const messageId = `wxmsg_${randomUUID()}`
    const localFileName = path.basename(file.clientName || 'file')
    const localFileStats = await statFile(file.tmpPath)
    const localMedia = await storeOutboundMedia({
      accountId: account.id,
      messageId,
      itemIndex: 0,
      filePath: file.tmpPath,
      fileName: localFileName,
      contentType: mediaContentType(localFileName, payload.mediaType, file),
      size: localFileStats.size,
    })
    let sent
    try {
      sent = await uploadAndSendMedia({
        client,
        cdnBaseUrl: account.cdnBaseUrl,
        filePath: file.tmpPath,
        fileName: path.basename(file.clientName || 'file'),
        mediaType: payload.mediaType,
        toUserId: payload.to,
        caption: payload.caption,
        contextToken,
        clientMessageId,
        runId: payload.runId,
      })
    } catch (error) {
      await removeLocalMedia(localMedia).catch(() => undefined)
      await WeixinMessage.create({
        id: `wxmsg_${randomUUID()}`,
        accountId: account.id,
        providerMessageId: null,
        providerSeq: null,
        clientMessageId,
        direction: 'outbound',
        fromUserId: account.ilinkUserId,
        toUserId: payload.to,
        payload: encodeMessagePayload({
          type: payload.mediaType,
          fileName: path.basename(file.clientName || 'file'),
          caption: payload.caption ?? null,
        }),
        status: 'failed',
        errorCode:
          error instanceof ILinkError && error.code !== undefined ? String(error.code) : null,
      })
      throw error
    }

    const storedItem = attachLocalMediaReference(sent.item, localMedia)
    const message = await WeixinMessage.create({
      id: messageId,
      accountId: account.id,
      providerMessageId: null,
      providerSeq: null,
      clientMessageId: sent.clientId,
      direction: 'outbound',
      fromUserId: account.ilinkUserId,
      toUserId: payload.to,
      payload: encodeMessagePayload({
        type: sent.mediaType,
        fileName: sent.fileName,
        caption: payload.caption ?? null,
        rawSize: sent.rawSize,
        ciphertextSize: sent.ciphertextSize,
        item_list: [storedItem],
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
        clientMessageId: sent.clientId,
        mediaType: sent.mediaType,
        status: message.status,
        sentAt: message.sentAt,
      })
    )
  }
}

function mediaContentType(fileName: string, mediaType: string, file: unknown) {
  const uploadedType = (file as { type?: unknown }).type
  if (typeof uploadedType === 'string' && uploadedType.trim()) return uploadedType

  const extension = path.extname(fileName).toLowerCase()
  const knownTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  }
  return (
    knownTypes[extension] ||
    (mediaType === 'image'
      ? 'image/jpeg'
      : mediaType === 'video'
        ? 'video/mp4'
        : 'application/octet-stream')
  )
}
