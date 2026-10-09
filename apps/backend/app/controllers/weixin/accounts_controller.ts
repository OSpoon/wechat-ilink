import type { HttpContext } from '@adonisjs/core/http'
import { connectionManager } from '#services/weixin/connection_manager'
import { findAccountOrFail, listAccounts, toPublicAccount } from '#services/weixin/account_service'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import {
  AccountResponseDocument,
  AccountsResponseDocument,
  ErrorResponseDocument,
} from '#openapi/schemas'

@ApiSecurity('BearerAuth')
@ApiResponse({ status: 401, description: '访问令牌缺失或无效。', type: ErrorResponseDocument })
export default class WeixinAccountsController {
  @ApiOperation({
    summary: '查询微信账号列表',
    description: '返回当前 API 用户已绑定的全部微信账号。',
  })
  @ApiResponse({ status: 200, description: '返回微信账号列表。', type: AccountsResponseDocument })
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    return await serialize(await listAccounts(user.id))
  }

  @ApiOperation({
    summary: '查询微信账号详情',
    description: '返回指定微信账号的连接状态和最近活动信息。',
  })
  @ApiResponse({ status: 200, description: '返回微信账号详情。', type: AccountResponseDocument })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  async show({ auth, params, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    return await serialize(toPublicAccount(await findAccountOrFail(user.id, params.accountId)))
  }

  @ApiOperation({ summary: '启动微信账号', description: '启动指定账号的 iLink 长轮询 Worker。' })
  @ApiResponse({
    status: 202,
    description: '微信账号 Worker 已启动。',
    type: AccountResponseDocument,
  })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  async start({ auth, params, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const account = await connectionManager.start(user.id, params.accountId)
    return response.accepted(await serialize(toPublicAccount(account)))
  }

  @ApiOperation({ summary: '停止微信账号', description: '停止指定账号的 iLink 长轮询 Worker。' })
  @ApiResponse({
    status: 200,
    description: '微信账号 Worker 已停止。',
    type: AccountResponseDocument,
  })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  async stop({ auth, params, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    return await serialize(toPublicAccount(await connectionManager.stop(user.id, params.accountId)))
  }

  @ApiOperation({
    summary: '删除已停止的微信账号',
    description: '永久删除已停止的账号及其消息、会话和账号级 Webhook 数据。',
  })
  @ApiResponse({ status: 204, description: '微信账号已删除。' })
  @ApiResponse({ status: 404, description: '微信账号不存在。', type: ErrorResponseDocument })
  @ApiResponse({
    status: 409,
    description: '账号正在运行或尚未停止。',
    type: ErrorResponseDocument,
  })
  async destroy({ auth, params, response }: HttpContext) {
    await connectionManager.deleteStopped(auth.getUserOrFail().id, params.accountId)
    return response.noContent()
  }
}
