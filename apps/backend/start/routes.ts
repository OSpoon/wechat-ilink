/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import { localizeOpenApiDocument } from '#services/openapi_localizer'
import router from '@adonisjs/core/services/router'
import openapi from '@foadonis/openapi/services/main'
import { apiThrottle, qrThrottle } from '#start/limiter'

const weixinAccounts = () => import('#controllers/weixin/accounts_controller')
const system = () => import('#controllers/system_controller')
const weixinLoginSessions = () => import('#controllers/weixin/login_sessions_controller')
const weixinMessages = () => import('#controllers/weixin/messages_controller')
const weixinMedia = () => import('#controllers/weixin/media_controller')
const weixinMediaDownload = () => import('#controllers/weixin/media_download_controller')
const weixinTyping = () => import('#controllers/weixin/typing_controller')
const weixinWebhooks = () => import('#controllers/weixin/webhooks_controller')

router.get('/', [system, 'index'])
router.get('/health', () => ({ status: 'ok' }))
router.get('/health/live', [system, 'live'])
router.get('/health/ready', [system, 'ready'])

router.get('/openapi.json', async ({ response }) => {
  const document = localizeOpenApiDocument(await openapi.buildDocument())
  response.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  return response.type('application/json').send(document)
})

router.get('/docs', async ({ response }) => {
  response.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  return response.type('text/html').send(openapi.generateUi('/openapi.json'))
})

router
  .group(() => {
    router.post('signup', [controllers.NewAccount, 'store'])
    router.post('login', [controllers.AccessTokens, 'store'])
  })
  .prefix('/api/v1/auth')
  .use(apiThrottle)

router
  .group(() => {
    router.get('profile', [controllers.Profile, 'show'])
    router.post('logout', [controllers.AccessTokens, 'destroy'])
    router.get('settings', [controllers.Settings, 'show'])
    router.patch('settings/:section', [controllers.Settings, 'update'])
  })
  .prefix('/api/v1/account')
  .use(middleware.auth({ guards: ['api'] }))
  .use(apiThrottle)

router
  .group(() => {
    router.get('accounts', [weixinAccounts, 'index'])
    router.get('accounts/:accountId', [weixinAccounts, 'show'])
    router.post('accounts/:accountId/start', [weixinAccounts, 'start'])
    router.post('accounts/:accountId/stop', [weixinAccounts, 'stop'])
    router.delete('accounts/:accountId', [weixinAccounts, 'destroy'])

    router.post('login-sessions', [weixinLoginSessions, 'store']).use(qrThrottle)
    router.get('login-sessions/:sessionId', [weixinLoginSessions, 'show'])
    router.post('login-sessions/:sessionId/verify', [weixinLoginSessions, 'verify'])
    router.delete('login-sessions/:sessionId', [weixinLoginSessions, 'destroy'])

    router.get('accounts/:accountId/messages', [weixinMessages, 'index'])
    router.get('accounts/:accountId/messages/:messageId/media/:itemIndex', [
      weixinMediaDownload,
      'show',
    ])
    router.post('accounts/:accountId/messages', [weixinMessages, 'store'])
    router.post('accounts/:accountId/messages/media', [weixinMedia, 'store'])
    router.post('accounts/:accountId/typing', [weixinTyping, 'store'])
    router.get('webhooks', [weixinWebhooks, 'index'])
    router.post('webhooks', [weixinWebhooks, 'store'])
    router.get('webhooks/:webhookId/deliveries', [weixinWebhooks, 'deliveries'])
    router.delete('webhooks/:webhookId', [weixinWebhooks, 'destroy'])
  })
  .prefix('/api/v1/weixin')
  .use(middleware.auth({ guards: ['api'] }))
  .use(apiThrottle)
