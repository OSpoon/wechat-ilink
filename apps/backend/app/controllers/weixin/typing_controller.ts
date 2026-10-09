import type { HttpContext } from '@adonisjs/core/http'
import { findAccountOrFail } from '#services/weixin/account_service'
import { sendTypingStatus } from '#services/weixin/typing_service'
import { typingValidator } from '#validators/weixin'
import { ApiOperation, ApiResponse, ApiSchema, ApiSecurity } from '@foadonis/openapi/decorators'
import { ErrorResponseDocument, TypingResponseDocument } from '#openapi/schemas'

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinTypingController {
  @ApiOperation({
    summary: '发送输入状态',
    description: '向目标用户发送正在输入或取消输入状态。',
  })
  @ApiSchema(typingValidator)
  @ApiResponse({ status: 200, description: '输入状态发送成功。', type: TypingResponseDocument })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  @ApiResponse({
    status: 409,
    description: '微信账号需要重新扫码登录。',
    type: ErrorResponseDocument,
  })
  @ApiResponse({ status: 422, description: '输入状态参数校验失败。', type: ErrorResponseDocument })
  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(typingValidator)
    const account = await findAccountOrFail(user.id, params.accountId)
    const result = await sendTypingStatus({
      account,
      toUserId: payload.to,
      status: payload.status as 1 | 2,
      contextToken: payload.contextToken,
    })
    return response.ok(await serialize(result))
  }
}
