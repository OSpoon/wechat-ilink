import { defineConfig } from '@foadonis/openapi'

const controllerTags: Record<string, string> = {
  SystemController: '系统',
  NewAccountController: '用户认证',
  AccessTokensController: '用户认证',
  ProfileController: '账号管理',
  SettingsController: '账号管理',
  WeixinLoginSessionsController: '微信接入',
  WeixinAccountsController: '微信账号',
  WeixinMessagesController: '微信消息',
  WeixinMediaController: '微信消息',
  WeixinMediaDownloadController: '微信消息',
  WeixinTypingController: '微信消息',
  WeixinWebhooksController: '消息回调',
}

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: '微信 iLink API',
      version: '0.0.1',
      description:
        '通过 iLink 协议连接微信的 API 服务，提供扫码登录、消息收发、媒体和 Webhook 能力。',
    },
    tags: [
      { name: '系统', description: '服务存活、就绪和基础信息。' },
      { name: '用户认证', description: '用户注册、登录和访问令牌管理。' },
      { name: '账号管理', description: '当前 API 用户信息和访问令牌管理。' },
      { name: '微信接入', description: '微信二维码登录和账号接入。' },
      { name: '微信账号', description: '微信账号列表、状态和 Worker 管理。' },
      { name: '微信消息', description: '微信消息收发、媒体和输入状态。' },
      { name: '消息回调', description: '入站消息 Webhook 配置和投递记录。' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API 访问令牌',
        },
      },
    },
  },
  tagger: (_route, target) => [controllerTags[target.name] ?? target.name],
})
