import type { HttpContext } from '@adonisjs/core/http'
import { verifyCodeValidator } from '#validators/weixin'
import {
  cancelLogin,
  getLoginSession,
  startLogin,
  submitVerifyCode,
} from '#services/weixin/login_service'
import { ApiOperation, ApiResponse, ApiSchema, ApiSecurity } from '@foadonis/openapi/decorators'
import { ErrorResponseDocument, LoginSessionResponseDocument } from '#openapi/schemas'

function present(session: Awaited<ReturnType<typeof getLoginSession>>) {
  if (!session) return null
  return {
    id: session.id,
    status: session.status,
    qrUrl:
      session.status === 'waiting_scan' ||
      session.status === 'scanned' ||
      session.status === 'need_verifycode'
        ? session.qrcodeUrl
        : undefined,
    accountId: session.accountId ?? null,
    ilinkUserId: session.ilinkUserId ?? null,
    errorMessage: session.errorMessage ?? null,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinLoginSessionsController {
  @ApiOperation({
    summary: '创建二维码登录会话',
    description: '创建微信二维码并返回登录会话 ID，之后需要轮询会话状态。',
  })
  @ApiResponse({
    status: 202,
    description: '二维码登录会话已创建。',
    type: LoginSessionResponseDocument,
  })
  async store({ auth, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const session = await startLogin(user.id)
    return response.accepted(await serialize(present(session)))
  }

  @ApiOperation({ summary: '查询二维码登录状态', description: '查询扫码、验证和登录确认状态。' })
  @ApiResponse({
    status: 200,
    description: '返回当前二维码登录状态。',
    type: LoginSessionResponseDocument,
  })
  @ApiResponse({ status: 404, description: '登录会话不存在。', type: ErrorResponseDocument })
  async show({ auth, params, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const session = await getLoginSession(user.id, params.sessionId)
    if (!session)
      return response.notFound({
        error: { code: 'LOGIN_SESSION_NOT_FOUND', message: 'Login session not found' },
      })
    return await serialize(present(session))
  }

  @ApiOperation({
    summary: '提交微信安全验证码',
    description: '当微信要求数字验证时提交手机上显示的验证码。',
  })
  @ApiSchema(verifyCodeValidator)
  @ApiResponse({ status: 200, description: '验证码已提交。', type: LoginSessionResponseDocument })
  @ApiResponse({ status: 404, description: '登录会话不存在。', type: ErrorResponseDocument })
  @ApiResponse({ status: 422, description: '验证码格式校验失败。', type: ErrorResponseDocument })
  async verify({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(verifyCodeValidator)
    return await serialize(present(await submitVerifyCode(user.id, params.sessionId, payload.code)))
  }

  @ApiOperation({ summary: '取消二维码登录', description: '取消尚未完成的二维码登录会话。' })
  @ApiResponse({ status: 204, description: '二维码登录会话已取消。' })
  @ApiResponse({ status: 404, description: '登录会话不存在。', type: ErrorResponseDocument })
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const session = await cancelLogin(user.id, params.sessionId)
    if (!session)
      return response.notFound({
        error: { code: 'LOGIN_SESSION_NOT_FOUND', message: 'Login session not found' },
      })
    return response.noContent()
  }
}
