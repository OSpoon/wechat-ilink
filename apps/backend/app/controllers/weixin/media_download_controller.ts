import type { HttpContext } from '@adonisjs/core/http'
import { findAccountOrFail } from '#services/weixin/account_service'
import WeixinMessage from '#models/weixin_message'
import { downloadMedia } from '#services/weixin/media_download_service'
import { decodeMessagePayload } from '#services/weixin/message_payload_service'
import { localMediaReference, readLocalMedia } from '#services/weixin/local_media_service'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { ErrorResponseDocument } from '#openapi/schemas'

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinMediaDownloadController {
  @ApiOperation({
    summary: '下载消息媒体',
    description: '读取出站媒体的本地副本，或从微信 CDN 下载并解密接收媒体。',
  })
  @ApiResponse({
    status: 200,
    description: '返回解密后的媒体二进制内容。',
    schema: { type: 'string', format: 'binary' },
    mediaType: 'application/octet-stream',
  })
  @ApiResponse({ status: 404, description: '消息或媒体项不存在。', type: ErrorResponseDocument })
  @ApiResponse({ status: 502, description: '微信 CDN 媒体下载失败。', type: ErrorResponseDocument })
  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const account = await findAccountOrFail(user.id, params.accountId)
    const message = await WeixinMessage.query()
      .where('account_id', account.id)
      .where('id', params.messageId)
      .first()
    if (!message) {
      return response.notFound({
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' },
      })
    }

    const itemIndex = Number(params.itemIndex)
    const payload = decodeMessagePayload<{
      item_list?: Array<Parameters<typeof downloadMedia>[0]['item']>
    }>(message.payload)
    const item = payload.item_list?.[itemIndex]
    if (!Number.isInteger(itemIndex) || itemIndex < 0 || !item) {
      return response.notFound({
        error: { code: 'MEDIA_ITEM_NOT_FOUND', message: 'Media item not found' },
      })
    }

    const localReference = localMediaReference(item)
    try {
      if (localReference) {
        const media = await readLocalMedia(localReference)
        response.header('Content-Type', media.contentType)
        response.header(
          'Content-Disposition',
          `inline; filename*=UTF-8''${encodeURIComponent(media.fileName)}`
        )
        return response.send(media.buffer)
      }
      if (message.direction === 'outbound') {
        return response.status(502).send({
          error: {
            code: 'LOCAL_MEDIA_UNAVAILABLE',
            message: 'This outbound media was not stored locally and cannot be downloaded',
          },
        })
      }
      const media = await downloadMedia({
        item,
        cdnBaseUrl: account.cdnBaseUrl,
      })
      response.header('Content-Type', media.contentType)
      response.header(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(media.fileName)}`
      )
      return response.send(media.buffer)
    } catch (error) {
      return response.status(502).send({
        error: {
          code: localReference ? 'LOCAL_MEDIA_READ_FAILED' : 'CDN_MEDIA_DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'CDN media download failed',
        },
      })
    }
  }
}
